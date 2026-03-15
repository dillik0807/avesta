// Запустить один раз: node generate-icons.js
// Генерирует иконки icons/icon-192.png и icons/icon-512.png

const fs = require('fs');
const path = require('path');

// Создаём папку icons
if (!fs.existsSync('icons')) fs.mkdirSync('icons');

// SVG иконка Avesta
const svgIcon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#1e40af"/>
  <text x="50" y="58" font-family="Arial,sans-serif" font-size="42" font-weight="bold" fill="white" text-anchor="middle">A</text>
  <text x="50" y="80" font-family="Arial,sans-serif" font-size="14" fill="#93c5fd" text-anchor="middle">2026</text>
</svg>`;

fs.writeFileSync('icons/icon-192.svg', svgIcon(192));
fs.writeFileSync('icons/icon-512.svg', svgIcon(512));

console.log('✅ SVG иконки созданы в папке icons/');
console.log('⚠️  Для PNG конвертации используйте: https://svgtopng.com');
console.log('   или установите: npm install sharp && node convert-icons.js');
