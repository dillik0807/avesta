/**
 * 🧠 AI Office — встроенный в Avesta 2026
 * Мультиагентная система для склада
 */

const AIOffice = (() => {
    const AGENTS = [
        { id: '',          emoji: '🧠', name: 'Авто (CEO маршрутизирует)' },
        { id: 'analytics', emoji: '📊', name: 'Analytics — данные и KPI' },
        { id: 'finance',   emoji: '💰', name: 'Finance — долги и финансы' },
        { id: 'logistics', emoji: '🚂', name: 'Logistics — склад и товары' },
        { id: 'hr',        emoji: '👥', name: 'HR — персонал' },
        { id: 'general',   emoji: '💬', name: 'General — общие вопросы' },
    ];

    const DEPT_COLORS = {
        ceo:       '#6366f1',
        analytics: '#06b6d4',
        finance:   '#10b981',
        logistics: '#f59e0b',
        hr:        '#ec4899',
        general:   '#8b5cf6',
    };

    const EXAMPLES = [
        'Как оптимизировать остатки товаров на складах?',
        'Какие клиенты имеют наибольшую задолженность?',
        'Помоги составить отчёт по расходу за месяц',
        'Какие KPI важны для складской компании?',
        'Как работать с разделом "Приход" в системе?',
        'Советы по управлению дебиторской задолженностью',
    ];

    let messages = [];
    let selectedDept = '';
    let isLoading = false;
    let eventSource = null;

    function init() {
        renderChat();
        bindEvents();
    }

    function renderChat() {
        const section = document.getElementById('ai-office');
        if (!section) return;

        section.innerHTML = `
        <div style="display:flex; flex-direction:column; height:calc(100vh - 80px); max-width:900px; margin:0 auto;">

            <!-- Header -->
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
                <div>
                    <h1 style="font-size:1.5rem; font-weight:700; color:#1e293b; margin:0;">
                        🧠 AI Office
                    </h1>
                    <p style="font-size:0.8rem; color:#64748b; margin:4px 0 0 0;">
                        Умный помощник для вашего склада — 6 специализированных агентов
                    </p>
                </div>
                <!-- Agent selector -->
                <div style="position:relative;">
                    <select id="ai-agent-select" onchange="AIOffice.setDept(this.value)"
                        style="padding:8px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:0.85rem; background:#fff; cursor:pointer; color:#374151; min-width:220px;">
                        ${AGENTS.map(a => `<option value="${a.id}">${a.emoji} ${a.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Messages container -->
            <div id="ai-messages" style="flex:1; overflow-y:auto; padding:8px 0; display:flex; flex-direction:column; gap:12px;">
                ${renderWelcome()}
            </div>

            <!-- Input -->
            <div style="margin-top:12px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:12px; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
                <div style="display:flex; gap:8px; align-items:flex-end;">
                    <textarea id="ai-input" placeholder="Задайте вопрос... (Enter — отправить, Shift+Enter — новая строка)"
                        rows="1"
                        style="flex:1; border:none; outline:none; resize:none; font-size:0.875rem; color:#374151; max-height:120px; overflow-y:auto; line-height:1.5;"
                        onkeydown="AIOffice.handleKey(event)"
                        oninput="this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,120)+'px'">
                    </textarea>
                    <button id="ai-send-btn" onclick="AIOffice.send()"
                        style="padding:8px 16px; background:#4f46e5; color:#fff; border:none; border-radius:8px; cursor:pointer; font-size:0.875rem; font-weight:500; white-space:nowrap; transition:background 0.2s;"
                        onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'">
                        Отправить ➤
                    </button>
                </div>
            </div>
        </div>`;
    }

    function renderWelcome() {
        return `
        <div id="ai-welcome" style="display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; padding:24px; text-align:center; gap:20px;">
            <div>
                <div style="font-size:3rem; margin-bottom:8px;">🧠</div>
                <h2 style="font-size:1.2rem; font-weight:600; color:#1e293b; margin:0 0 8px;">AI Smart Office</h2>
                <p style="color:#64748b; font-size:0.875rem;">CEO Agent направит ваш вопрос нужному специалисту</p>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; max-width:640px; width:100%;">
                ${EXAMPLES.map(ex => `
                <button onclick="AIOffice.sendText('${ex.replace(/'/g, "\\'")}') "
                    style="padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:0.8rem; color:#475569; cursor:pointer; text-align:left; transition:all 0.15s;"
                    onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#94a3b8'"
                    onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#e2e8f0'">
                    ${ex}
                </button>`).join('')}
            </div>
        </div>`;
    }

    function setDept(val) {
        selectedDept = val;
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    function send() {
        const input = document.getElementById('ai-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text || isLoading) return;
        input.value = '';
        input.style.height = 'auto';
        sendText(text);
    }

    async function sendText(text) {
        if (isLoading) return;

        // Hide welcome
        const welcome = document.getElementById('ai-welcome');
        if (welcome) welcome.remove();

        // Add user message
        appendMessage({ role: 'user', content: text });
        messages.push({ role: 'user', content: text });

        isLoading = true;
        const btn = document.getElementById('ai-send-btn');
        if (btn) { btn.disabled = true; btn.textContent = '...'; }

        // Show typing indicator
        const typingId = 'typing-' + Date.now();
        appendTyping(typingId);

        try {
            const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || getTokenFromCookie();
            const params = new URLSearchParams({ message: text });
            if (selectedDept) params.set('department', selectedDept);

            // Cancel previous stream
            if (eventSource) { eventSource.close(); eventSource = null; }

            let streamContent = '';
            let currentDept = null;
            let stepShown = false;

            // Use fetch with SSE
            const response = await fetch(`/api/ai/stream?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const err = await response.json();
                removeTyping(typingId);
                appendMessage({ role: 'assistant', content: `❌ ${err.error || 'Ошибка сервера'}`, dept: 'general', emoji: '⚠️', agent: 'System' });
                isLoading = false;
                resetBtn();
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const raw = line.slice(6).trim();
                    if (!raw) continue;

                    try {
                        const data = JSON.parse(raw);

                        if (data.type === 'step') {
                            updateTyping(typingId, `${data.emoji || '🧠'} ${data.message}`);
                        } else if (data.type === 'department') {
                            currentDept = data;
                            updateTyping(typingId, `${data.emoji} ${data.agent} отвечает...`);
                        } else if (data.type === 'token') {
                            if (!stepShown) {
                                removeTyping(typingId);
                                stepShown = true;
                                // Start streaming message
                                startStreamMessage(typingId + '-msg', currentDept);
                            }
                            streamContent += data.content;
                            updateStreamMessage(typingId + '-msg', streamContent);
                        } else if (data.type === 'done') {
                            if (streamContent) {
                                finalizeStreamMessage(typingId + '-msg', streamContent, currentDept || { dept: 'general', agent: 'AI Agent', emoji: '🤖' });
                                messages.push({ role: 'assistant', content: streamContent });
                            }
                        } else if (data.type === 'error') {
                            removeTyping(typingId);
                            appendMessage({ role: 'assistant', content: `❌ ${data.message}`, dept: 'general', emoji: '⚠️', agent: 'System' });
                        }
                    } catch (e) { /* skip parse errors */ }
                }
            }

        } catch (err) {
            removeTyping(typingId);
            appendMessage({ role: 'assistant', content: `❌ Ошибка подключения: ${err.message}`, dept: 'general', emoji: '⚠️', agent: 'System' });
        }

        isLoading = false;
        resetBtn();
        scrollToBottom();
    }

    function appendMessage(msg) {
        const container = document.getElementById('ai-messages');
        if (!container) return;

        const div = document.createElement('div');
        div.style.cssText = `display:flex; gap:10px; ${msg.role === 'user' ? 'flex-direction:row-reverse;' : ''}`;

        const color = DEPT_COLORS[msg.dept] || '#6366f1';

        if (msg.role === 'user') {
            div.innerHTML = `
            <div style="width:32px; height:32px; border-radius:50%; background:#e0e7ff; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0;">👤</div>
            <div style="max-width:70%; background:#eff6ff; border:1px solid #bfdbfe; border-radius:12px 12px 4px 12px; padding:10px 14px; font-size:0.875rem; color:#1e40af; white-space:pre-wrap;">${escapeHtml(msg.content)}</div>`;
        } else {
            div.innerHTML = `
            <div style="width:32px; height:32px; border-radius:50%; background:${color}22; border:1px solid ${color}44; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">${msg.emoji || '🤖'}</div>
            <div style="flex:1; max-width:75%;">
                <div style="font-size:0.75rem; font-weight:600; color:${color}; margin-bottom:4px;">${msg.agent || 'AI Agent'}</div>
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:4px 12px 12px 12px; padding:12px 14px; font-size:0.875rem; color:#334155; line-height:1.6;">${formatMarkdown(msg.content)}</div>
            </div>`;
        }

        container.appendChild(div);
        scrollToBottom();
    }

    function appendTyping(id) {
        const container = document.getElementById('ai-messages');
        if (!container) return;

        const div = document.createElement('div');
        div.id = id;
        div.style.cssText = 'display:flex; gap:10px; align-items:center;';
        div.innerHTML = `
        <div style="width:32px; height:32px; border-radius:50%; background:#f1f5f9; border:1px solid #e2e8f0; display:flex; align-items:center; justify-content:center; font-size:16px;">🧠</div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px 12px 12px 12px; padding:10px 14px; font-size:0.8rem; color:#64748b;" id="${id}-text">
            <span>Думаю</span><span class="ai-dots">...</span>
        </div>`;
        container.appendChild(div);
        scrollToBottom();
    }

    function updateTyping(id, text) {
        const el = document.getElementById(id + '-text');
        if (el) el.innerHTML = `<span>${escapeHtml(text)}</span>`;
        scrollToBottom();
    }

    function removeTyping(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function startStreamMessage(id, dept) {
        const container = document.getElementById('ai-messages');
        if (!container) return;

        const color = dept ? (DEPT_COLORS[dept.department] || '#6366f1') : '#6366f1';
        const emoji = dept ? dept.emoji : '🤖';
        const agent = dept ? dept.agent : 'AI Agent';

        const div = document.createElement('div');
        div.id = id;
        div.style.cssText = 'display:flex; gap:10px;';
        div.innerHTML = `
        <div style="width:32px; height:32px; border-radius:50%; background:${color}22; border:1px solid ${color}44; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">${emoji}</div>
        <div style="flex:1; max-width:75%;">
            <div style="font-size:0.75rem; font-weight:600; color:${color}; margin-bottom:4px;">${agent}</div>
            <div id="${id}-content" style="background:#fff; border:1px solid #e2e8f0; border-radius:4px 12px 12px 12px; padding:12px 14px; font-size:0.875rem; color:#334155; line-height:1.6;"></div>
        </div>`;
        container.appendChild(div);
        scrollToBottom();
    }

    function updateStreamMessage(id, content) {
        const el = document.getElementById(id + '-content');
        if (el) el.innerHTML = formatMarkdown(content) + '<span style="animation:blink 1s infinite;">▊</span>';
        scrollToBottom();
    }

    function finalizeStreamMessage(id, content, dept) {
        const el = document.getElementById(id + '-content');
        if (el) el.innerHTML = formatMarkdown(content);
        scrollToBottom();
    }

    function resetBtn() {
        const btn = document.getElementById('ai-send-btn');
        if (btn) { btn.disabled = false; btn.textContent = 'Отправить ➤'; }
    }

    function scrollToBottom() {
        const c = document.getElementById('ai-messages');
        if (c) c.scrollTop = c.scrollHeight;
    }

    function getTokenFromCookie() {
        const cookies = document.cookie.split(';');
        for (const c of cookies) {
            const [k, v] = c.trim().split('=');
            if (k === 'authToken') return v;
        }
        return '';
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function formatMarkdown(text) {
        if (!text) return '';
        return text
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre style="background:#f1f5f9;padding:10px;border-radius:6px;overflow-x:auto;font-size:0.8rem;"><code>$1</code></pre>')
            // Inline code
            .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:0.8rem;color:#6366f1;">$1</code>')
            // Bold
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            // Italic
            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
            // Headers
            .replace(/^### (.+)$/gm, '<h3 style="font-size:0.95rem;font-weight:700;margin:10px 0 4px;color:#1e293b;">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 style="font-size:1rem;font-weight:700;margin:12px 0 6px;color:#1e293b;">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 style="font-size:1.1rem;font-weight:700;margin:14px 0 6px;color:#1e293b;">$1</h1>')
            // Lists
            .replace(/^[\-\*] (.+)$/gm, '<li style="margin:2px 0;">$1</li>')
            .replace(/(<li.*<\/li>\n?)+/g, '<ul style="margin:6px 0;padding-left:20px;">$&</ul>')
            // Line breaks
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
    }

    // CSS animation for cursor blink
    const style = document.createElement('style');
    style.textContent = `@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`;
    document.head.appendChild(style);

    return { init, send, sendText, setDept };
})();

// Initialize when section is shown
document.addEventListener('DOMContentLoaded', () => {
    // Watch for AI section activation
    const observer = new MutationObserver(() => {
        const section = document.getElementById('ai-office');
        if (section && section.classList.contains('active') && !section.querySelector('#ai-messages')) {
            AIOffice.init();
        }
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
});
