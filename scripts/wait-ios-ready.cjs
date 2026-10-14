const fs = require('node:fs');
(async () => {
  for (let attempt = 0; attempt < 150; attempt++) {
    const log = fs.existsSync('artifacts/ios-console.log') ? fs.readFileSync('artifacts/ios-console.log', 'utf8') : '';
    if (log.includes('SE_UI_READY:')) { console.log('Native iOS page and calculation checks passed.'); return; }
    if (/SE_UI_FAILURE:|SE_UI_NOT_READY:/.test(log)) throw new Error('Native iOS page verification failed; inspect ios-console.log.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('Native iOS readiness signal did not arrive; inspect ios-console.log.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
