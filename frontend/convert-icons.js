const sharp = require('sharp');
const fs = require('fs');

if (!fs.existsSync('icons')) fs.mkdirSync('icons');

const svg192 = Buffer.from(fs.readFileSync('icons/icon-192.svg'));
const svg512 = Buffer.from(fs.readFileSync('icons/icon-512.svg'));

Promise.all([
  sharp(svg192).resize(192, 192).png().toFile('icons/icon-192.png'),
  sharp(svg512).resize(512, 512).png().toFile('icons/icon-512.png')
]).then(() => {
  console.log('✅ PNG иконки созданы: icons/icon-192.png, icons/icon-512.png');
}).catch(e => console.error('❌', e.message));
