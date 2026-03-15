const sharp = require('sharp');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', 'icons', 'source.png');
const sizes = {
    'app/src/main/res/mipmap-mdpi/ic_launcher.png': 48,
    'app/src/main/res/mipmap-hdpi/ic_launcher.png': 72,
    'app/src/main/res/mipmap-xhdpi/ic_launcher.png': 96,
    'app/src/main/res/mipmap-xxhdpi/ic_launcher.png': 144,
    'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png': 192,
};

Promise.all(
    Object.entries(sizes).map(([dest, size]) =>
        sharp(src).resize(size, size).png().toFile(path.join(__dirname, dest))
    )
).then(() => console.log('✅ Иконки созданы')).catch(e => console.error('❌', e.message));
