const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
(async () => {
  const root = path.resolve(__dirname, '..');
  const svg = await fs.readFile(path.join(root, 'icon.svg'));
  for (const [density, scale] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    const canvas = 108 * scale, size = Math.round(65 * scale);
    const art = await sharp(svg).resize(size, size).png().toBuffer();
    await sharp({ create: { width: canvas, height: canvas, channels: 4, background: { r: 18, g: 56, b: 95, alpha: 0 } } }).composite([{ input: art, gravity: 'centre' }]).png().toFile(path.join(root, `android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`));
  }
  await fs.writeFile(path.join(root, 'android/app/src/main/res/values/ic_launcher_background.xml'), '<resources><color name="ic_launcher_background">#12385f</color></resources>\n');
  console.log('Android adaptive launcher foregrounds generated from icon.svg.');
})().catch(error => { console.error(error); process.exitCode = 1; });
