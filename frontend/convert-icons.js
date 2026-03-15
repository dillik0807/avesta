const sharp = require('sharp');
const fs = require('fs');

if (!fs.existsSync('icons')) fs.mkdirSync('icons');

Promise.all([
  sharp('icons/source.png').resize(192, 192).png().toFile('icons/icon-192.png'),
  sharp('icons/source.png').resize(512, 512).png().toFile('icons/icon-512.png')
]).then(() => {
  console.log('✅ PNG иконки созданы: icons/icon-192.png, icons/icon-512.png');
}).catch(e => console.error('❌', e.message));
