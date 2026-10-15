const fs = require('node:fs');
const crypto = require('node:crypto');
const base = 'https://nawonwoo01.github.io/se-calculator/';
const files = ['index.html', 'app.js', 'calculator-core.js', 'release-config.js', 'sw.js', 'styles.css'];
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
(async () => {
  const deadline = Date.now() + 300000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const hashes = {};
      for (const name of files) {
        const url = new URL(name, base);
        url.searchParams.set('verify', process.env.GITHUB_SHA || 'manual');
        const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
        hashes[name] = digest(Buffer.from(await response.arrayBuffer()));
        if (hashes[name] !== digest(fs.readFileSync(name))) throw new Error(`${name}: deployed content differs from checked-out commit`);
      }
      fs.mkdirSync('artifacts', { recursive: true });
      fs.writeFileSync('artifacts/deployed-web-files.json', JSON.stringify({ url: base, verifiedAt: new Date().toISOString(), commit: process.env.GITHUB_SHA, hashes }, null, 2) + '\n');
      console.log(`Verified ${files.length} deployed files at ${base}; all SHA-256 hashes match.`);
      return;
    } catch (error) {
      lastError = error;
      console.log(`Waiting for Pages propagation: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  throw lastError || new Error('Deployed files were not verified');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
