/**
 * 🧠 AI Office Routes
 * Integrates multi-agent AI system into Avesta warehouse management
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const { authenticateToken } = require('./auth');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

// Agent system prompts
const AGENTS = {
    ceo: {
        name: 'CEO Agent',
        emoji: '🧠',
        color: '#6366f1',
        prompt: `Ты CEO Agent системы управления складом Avesta.
Твоя роль: анализировать запросы и направлять их к нужному специалисту.
Доступные отделы: analytics (аналитика данных склада), finance (финансы и долги), 
logistics (логистика и товары), hr (персонал), general (общие вопросы).

Отвечай ТОЛЬКО JSON в формате:
{"department": "analytics|finance|logistics|hr|general", "reasoning": "причина", "subtask": "переформулированная задача для агента"}`
    },
    analytics: {
        name: 'Analytics Agent',
        emoji: '📊',
        color: '#06b6d4',
        prompt: `Ты аналитик данных складской системы Avesta 2026.
Специализация: анализ данных прихода/расхода товаров, остатки на складах, 
KPI метрики, тренды, прогнозирование, интерпретация бизнес-данных.
Давай конкретные, практические рекомендации основанные на данных.
Отвечай на русском языке. Используй таблицы и цифры когда нужно.`
    },
    finance: {
        name: 'Finance Agent',
        emoji: '💰',
        color: '#10b981',
        prompt: `Ты финансовый аналитик компании Avesta 2026.
Специализация: анализ долгов клиентов, погашения, финансовые отчёты,
оборачиваемость средств, дебиторская задолженность, финансовое планирование.
Давай практические советы по управлению финансами торговой компании.
Отвечай на русском языке. Будь точным с цифрами.`
    },
    logistics: {
        name: 'Logistics Agent',
        emoji: '🚂',
        color: '#f59e0b',
        prompt: `Ты специалист по логистике и управлению складом Avesta 2026.
Специализация: управление запасами, оптимизация складов, работа с вагонами,
планирование поставок, управление остатками товаров, цепочки поставок.
Давай практические советы по оптимизации складской логистики.
Отвечай на русском языке.`
    },
    hr: {
        name: 'HR Agent',
        emoji: '👥',
        color: '#ec4899',
        prompt: `Ты HR специалист компании Avesta 2026.
Специализация: управление пользователями системы, роли и права доступа,
организация работы сотрудников, корпоративные процессы.
Давай практические советы по управлению персоналом торговой компании.
Отвечай на русском языке.`
    },
    general: {
        name: 'General Agent',
        emoji: '💬',
        color: '#8b5cf6',
        prompt: `Ты AI помощник системы управления складом Avesta 2026.
Помогаешь с любыми вопросами: использование системы, бизнес-советы, 
оптимизация процессов, ответы на общие вопросы.
Отвечай на русском языке. Будь полезным и конкретным.`
    }
};

// Helper: call OpenAI API
function callOpenAI(messages, stream = false) {
    return new Promise((resolve, reject) => {
        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
            reject(new Error('OpenAI API ключ не настроен. Добавьте OPENAI_API_KEY в переменные окружения Railway.'));
            return;
        }

        const body = JSON.stringify({
            model: OPENAI_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
            stream
        });

        const options = {
            hostname: 'api.openai.com',
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error) reject(new Error(parsed.error.message));
                    else resolve(parsed);
                } catch (e) {
                    reject(new Error('Ошибка разбора ответа OpenAI'));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Route: chat with AI (non-streaming)
router.post('/chat', authenticateToken, async (req, res) => {
    const { message, department } = req.body;
    if (!message) return res.status(400).json({ error: 'Сообщение не указано' });

    try {
        let targetDept = department;
        let ceoReasoning = null;

        // If no department specified, use CEO to route
        if (!targetDept) {
            const ceoMessages = [
                { role: 'system', content: AGENTS.ceo.prompt },
                { role: 'user', content: message }
            ];

            const ceoResponse = await callOpenAI(ceoMessages);
            const ceoText = ceoResponse.choices[0].message.content;

            try {
                const jsonMatch = ceoText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const routing = JSON.parse(jsonMatch[0]);
                    targetDept = routing.department || 'general';
                    ceoReasoning = routing.reasoning;
                    // Use refined subtask if available
                    if (routing.subtask) {
                        req.body.message = routing.subtask;
                    }
                }
            } catch (e) {
                targetDept = 'general';
            }
        }

        const agent = AGENTS[targetDept] || AGENTS.general;

        const deptMessages = [
            { role: 'system', content: agent.prompt },
            { role: 'user', content: req.body.message || message }
        ];

        const deptResponse = await callOpenAI(deptMessages);
        const answer = deptResponse.choices[0].message.content;

        res.json({
            department: targetDept,
            agent: agent.name,
            emoji: agent.emoji,
            color: agent.color,
            response: answer,
            routing: ceoReasoning
        });

    } catch (error) {
        console.error('AI error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Route: stream chat with AI (SSE)
router.get('/stream', authenticateToken, async (req, res) => {
    const { message, department } = req.query;
    if (!message) return res.status(400).json({ error: 'Сообщение не указано' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
        if (!OPENAI_API_KEY || OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
            send({ type: 'error', message: 'OpenAI API ключ не настроен в Railway' });
            res.end();
            return;
        }

        let targetDept = department;
        let finalMessage = message;

        // CEO routing
        if (!targetDept) {
            send({ type: 'step', emoji: '🧠', agent: 'CEO Agent', message: 'Анализирую запрос...' });

            const ceoResponse = await callOpenAI([
                { role: 'system', content: AGENTS.ceo.prompt },
                { role: 'user', content: message }
            ]);
            const ceoText = ceoResponse.choices[0].message.content;

            try {
                const jsonMatch = ceoText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const routing = JSON.parse(jsonMatch[0]);
                    targetDept = routing.department || 'general';
                    if (routing.subtask) finalMessage = routing.subtask;
                }
            } catch (e) {
                targetDept = 'general';
            }
        }

        const agent = AGENTS[targetDept] || AGENTS.general;
        send({ type: 'department', department: targetDept, agent: agent.name, emoji: agent.emoji, color: agent.color });

        // Stream department response
        const streamBody = JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: agent.prompt },
                { role: 'user', content: finalMessage }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            stream: true
        });

        await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.openai.com',
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Length': Buffer.byteLength(streamBody)
                }
            };

            const apiReq = https.request(options, (apiRes) => {
                let buffer = '';
                apiRes.on('data', (chunk) => {
                    buffer += chunk.toString();
                    const lines = buffer.split('\n');
                    buffer = lines.pop();

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') continue;
                            try {
                                const parsed = JSON.parse(data);
                                const token = parsed.choices?.[0]?.delta?.content;
                                if (token) send({ type: 'token', content: token });
                            } catch (e) { /* skip */ }
                        }
                    }
                });
                apiRes.on('end', resolve);
                apiRes.on('error', reject);
            });

            apiReq.on('error', reject);
            apiReq.write(streamBody);
            apiReq.end();
        });

        send({ type: 'done', department: targetDept });

    } catch (error) {
        send({ type: 'error', message: error.message });
    }

    res.end();
});

// Route: get agents info
router.get('/agents', authenticateToken, (req, res) => {
    const agents = Object.entries(AGENTS).map(([id, cfg]) => ({
        id,
        name: cfg.name,
        emoji: cfg.emoji,
        color: cfg.color
    }));
    res.json(agents);
});

module.exports = router;
