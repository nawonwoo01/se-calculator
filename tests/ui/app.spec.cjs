const { test, expect } = require('@playwright/test');
async function fillPatient(page) {
  await page.locator('#wt').fill('60');
  await page.locator('#infusionOptions').evaluate(el => { el.open = true; });
  await page.locator('#mixtureMode').selectOption('manual');
  await page.locator('#baseMixMg').fill('600'); await page.locator('#mixMl').fill('500');
}
test('invalid inputs clear old results', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await expect(page.locator('#rateOut')).toHaveText('—'); await fillPatient(page);
  await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
  await page.locator('#mixMl').fill('0'); await expect(page.locator('#rateOut')).toHaveText('—'); await expect(page.locator('#rateTable')).toBeEmpty();
  await page.locator('#mixMl').fill('500'); await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
  await page.locator('#wt').fill('-1'); await expect(page.locator('#asmLoadOut')).toHaveText('—'); expect(errors).toEqual([]);
});
test('each comparison sedative needs its own mixture', async ({ page }) => {
  await page.goto('/'); await fillPatient(page); await page.locator('#sedativeChecks input[value="propofol"]').check();
  const row = page.locator('#rateTable tr').filter({ has: page.getByRole('cell', { name: '50 mcg/kg/min', exact: true }) }); await expect(row).toContainText('혼합액 입력 필요');
  await page.locator('#compare_propofol_mg').fill('1000'); await page.locator('#compare_propofol_ml').fill('100'); await expect(row).toContainText('18 mL/hr');
  await page.locator('#sedativeChecks input[value="midazolam"]').uncheck(); await page.locator('#sedativeChecks input[value="propofol"]').uncheck();
  await expect(page.locator('#rateOut')).toHaveText('—');
});
test('ASM PE units, default preset, duration rejection and STESS maximum', async ({ page }) => {
  await page.goto('/'); await fillPatient(page); await page.locator('[data-tab="asm"]').click(); await expect(page.locator('#asmLoadOut')).toHaveText('3600 mg');
  await page.locator('#asmDrug').selectOption('fpht'); await expect(page.locator('#asmDoseOut')).toHaveText('20 mg PE/kg'); await expect(page.locator('#asmLoadOut')).toHaveText('1200 mg PE');
  await page.locator('#asmMinutes').fill('0'); await expect(page.locator('#asmRateOut')).toHaveText('—');
  await page.locator('[data-tab="scores"]').click(); await page.locator('#stessAge').check(); await page.locator('#stessNoHx').check();
  await page.locator('#stessType').selectOption('2'); await page.locator('#stessCon').selectOption('1'); await expect(page.locator('#stessOut')).toHaveText('6/6');
});
test('case labels are text and new cases clear patient context', async ({ page }) => {
  await page.goto('/'); await fillPatient(page); await page.locator('#caseOptions summary').click(); await page.locator('#patientName').fill('<img src=x onerror=alert(1)>'); await page.locator('#savePatient').click();
  await expect(page.locator('#patientSelect option').last()).toContainText('<img'); expect(await page.locator('#patientSelect img').count()).toBe(0);
  await page.locator('[data-tab="warnings"]').click(); await page.locator('#warn_renal').check(); await page.locator('[data-tab="sedation"]').click(); await page.locator('#newCase').click();
  await expect(page.locator('#wt')).toHaveValue(''); await expect(page.locator('#warn_renal')).not.toBeChecked(); await page.locator('#clearCases').click();
  expect(await page.evaluate(() => localStorage.getItem('se-calculator-patient-profiles-v1'))).toBeNull();
});
test('invalid Admin import cannot change calculations', async ({ page }) => {
  await page.goto('/'); await fillPatient(page); await page.locator('[data-tab="admin"]').click(); await page.locator('#importConfig').fill('{"sedatives":{},"asms":{}}'); await page.locator('#applyImport').click();
  await expect(page.locator('#adminStatus')).toContainText('Import failed'); await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
  expect(await page.evaluate(() => localStorage.getItem('se-calculator-admin-config-v1'))).toBeNull();
});
test('changing the primary drug preserves its own concentration and resets dose units', async ({ page }) => {
  await page.goto('/'); await fillPatient(page);
  await page.locator('#sedativeChecks input[value="propofol"]').check();
  await page.locator('#compare_propofol_mg').fill('1000'); await page.locator('#compare_propofol_ml').fill('100');
  await page.locator('#sedativeChecks input[value="midazolam"]').uncheck();
  await page.locator('#sedativeChecks input[value="ketamine"]').uncheck();
  await expect(page.locator('#baseMixMg')).toHaveValue('1000'); await expect(page.locator('#mixMl')).toHaveValue('100');
  await expect(page.locator('#rateDose')).toHaveValue('20'); await expect(page.locator('#rateOut')).toHaveText('7.2 mL/hr');
});
test('PWA caches privacy separately and calculator reloads offline', async ({ page, context }) => {
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true); await page.goto('/privacy.html');
  await expect(page.locator('h1')).toHaveText('개인정보 처리방침');
  await page.goto('/index.html'); await fillPatient(page); await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
});

test('existing browser cases remain available after the web update', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('se-calculator-patient-profiles-v1', JSON.stringify({
      activePatientId: 'legacy-case', profiles: [{ id: 'legacy-case', name: 'Legacy anonymous case', wt: 60, ht: 170,
        sex: 'male', dosingWeight: 'actual', asmWeight: 'actual', baseMixMg: 600, mixMultiplier: 1, fluidPreset: '500', mixMl: 500 }]
    }));
  });
  await page.goto('/');
  await expect(page.locator('#patientSelect')).toHaveValue('legacy-case');
  await expect(page.locator('#wt')).toHaveValue('60');
  await expect(page.locator('#rateOut')).toHaveText('200 mL/hr');
  await expect(page.locator('#appVersion')).toContainText('v0.2.0');
});

test('legacy v8 PWA waits for user action before activating the new cache', async ({ page }) => {
  const http = require('node:http');
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.resolve(__dirname, '../..');
  let updated = false;
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = pathname === '/sw.js' && !updated ? path.join(root, 'tests/fixtures/legacy-sw-v8.js') :
      path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404); response.end(); return;
    }
    const mime = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await fillPatient(page);
    await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
    updated = true;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect(page.locator('#updateNotice')).toBeVisible();
    await expect(page.locator('#wt')).toHaveValue('60');
    await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
    await Promise.all([page.waitForEvent('load'), page.locator('#applyUpdate').click()]);
    await page.waitForFunction(async () => {
      const names = await caches.keys();
      return names.includes('se-calculator-0.2.0-web-20261022-1') && !names.includes('se-calculator-2026-07-v8');
    });
    await fillPatient(page);
    await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
    await page.screenshot({ path: 'artifacts/web-update-phone.png', fullPage: true });
  } finally {
    await page.goto('about:blank');
    await new Promise(resolve => server.close(resolve));
  }
});

test('weight alone displays all 1x fluid recipes, scaled mixtures, rates and separate shooting doses', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#bodyOptions')).not.toHaveAttribute('open', '');
  await expect(page.locator('#scaledMixResults')).toBeEmpty();
  await page.locator('#wt').fill('60');
  await expect(page.locator('#ht')).toHaveValue('');
  for (const [volume, mg] of [[100,6],[250,15],[500,30],[1000,60]]) {
    const row = page.locator(`#oneMixTable tr[data-volume="${volume}"]`);
    await expect(row.locator('td')).toHaveText([`${mg} mg`, `${mg} mg`]);
  }
  await expect(page.locator('#midazolamMixMg')).toHaveText('30 mg');
  await expect(page.locator('#ketamineMixMg')).toHaveText('30 mg');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await expect(page.locator('#ketamineLoadingOut')).toHaveText('60 mg');
  const midaz01 = page.locator('#autoRateTable tr[data-drug="midazolam"][data-dose="0.1"]');
  await expect(midaz01).toContainText('100 mL/hr');
  await page.locator('#fluidPreset').selectOption('1000');
  await expect(page.locator('#midazolamMixMg')).toHaveText('60 mg');
  await expect(midaz01).toContainText('100 mL/hr');
  await page.locator('#mixMultiplier').selectOption('10');
  await expect(page.locator('#midazolamMixMg')).toHaveText('600 mg');
  await expect(midaz01).toContainText('10 mL/hr');
  await expect(page.locator('#mixEquivalent')).toContainText('10 mL/hr = 0.1 mg/kg/hr');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await page.locator('#fluidPreset').selectOption('250');
  await expect(page.locator('#midazolamMixMg')).toHaveText('150 mg');
  await page.locator('#wt').fill('70');
  await expect(page.locator('#midazolamMixMg')).toHaveText('175 mg');
  await expect(page.locator('#ketamineLoadingOut')).toHaveText('70 mg');
  await expect(midaz01).toContainText('10 mL/hr');
  await expect(page.locator('#infusionOptions')).not.toHaveAttribute('open', '');
  expect(errors).toEqual([]);
});

test('optional height cannot block actual-weight results; selecting derived weight requires height', async ({ page }) => {
  await page.goto('/'); await page.locator('#wt').fill('60');
  await page.locator('#bodyOptions summary').click();
  await page.locator('#ht').fill('0');
  await expect(page.locator('#midazolamMixMg')).toHaveText('30 mg');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await page.locator('#ht').fill(''); await page.locator('#dosingWeight').selectOption('ibw');
  await expect(page.locator('#scaledMixResults')).toBeEmpty();
  await expect(page.locator('#loadOut')).toBeEmpty();
  await expect(page.locator('#autoMixError')).toContainText('키와 성별');
  await expect(page.locator('#asmLoadOut')).toHaveText('3600 mg');
  await page.locator('#ht').fill('170');
  await expect(page.locator('#bodyMetrics')).toContainText('BMI 20.8');
  await expect(page.locator('#autoMixWeight')).toContainText('IBW');
  await page.locator('#ht').fill('');
  await expect(page.locator('#scaledMixResults')).toBeEmpty();
  await page.locator('#dosingWeight').selectOption('actual');
  await expect(page.locator('#midazolamMixMg')).toHaveText('30 mg');
});

test('invalid weight clears every weight-derived result; an invalid manual mixture leaves shooting independent', async ({ page }) => {
  await page.goto('/'); await fillPatient(page);
  await page.locator('#mixMl').fill('0');
  await expect(page.locator('#rateOut')).toHaveText('—');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await expect(page.locator('#midazolamMixMg')).toHaveText('30 mg');
  for (const value of ['', '0', '-1', '501']) {
    await page.locator('#wt').fill(value);
    for (const id of ['oneMixTable','scaledMixResults','autoRateTable','loadOut']) await expect(page.locator('#' + id)).toBeEmpty();
    await expect(page.locator('#asmLoadOut')).toHaveText('—');
  }
});

test('a case with weight only saves and reloads without requiring optional fields', async ({ page }) => {
  await page.goto('/'); await page.locator('#wt').fill('60');
  await page.locator('#caseOptions summary').click(); await page.locator('#patientName').fill('Weight only');
  await page.locator('#savePatient').click();
  await expect(page.locator('#caseStatus')).toContainText('저장했습니다');
  await page.reload();
  await expect(page.locator('#wt')).toHaveValue('60'); await expect(page.locator('#ht')).toHaveValue('');
  await expect(page.locator('#midazolamMixMg')).toHaveText('30 mg');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
});
