const { test, expect } = require('@playwright/test');
async function fillPatient(page) {
  await page.locator('#wt').fill('60');
  await page.locator('#infusionOptions').evaluate(el => { el.open = true; });
  await page.locator('#doseTableOptions').evaluate(el => { el.open = true; });
  await page.locator('#mixtureMode').selectOption('manual');
  await page.locator('#baseMixMg').fill('600'); await page.locator('#mixMl').fill('500');
}
test('invalid inputs clear old results', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await expect(page.locator('#rateOut')).toHaveText('—'); await fillPatient(page);
  await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
  await page.locator('#mixMl').fill('0'); await expect(page.locator('#rateOut')).toHaveText('—'); await expect(page.locator('#rateTable tr[data-drug="midazolam"]').first()).toContainText('혼합액 입력 필요');
  await page.locator('#mixMl').fill('500'); await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
  await page.locator('#wt').fill('-1'); await expect(page.locator('#asmLoadOut')).toHaveText('—'); expect(errors).toEqual([]);
});
test('each comparison sedative needs its own mixture', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await fillPatient(page); await page.locator('#sedativeChecks input[value="propofol"]').check();
  const row = page.locator('#rateTable tr').filter({ has: page.getByRole('cell', { name: '50 mcg/kg/min', exact: true }) }); await expect(row).toContainText('혼합액 입력 필요');
  await page.locator('#compare_propofol_mg').fill('1000'); await page.locator('#compare_propofol_ml').fill('100'); await expect(row).toContainText('18 mL/hr');
  await page.locator('#sedativeChecks input[value="midazolam"]').uncheck(); await page.locator('#sedativeChecks input[value="propofol"]').uncheck();
  await expect(page.locator('#rateOut')).toHaveText('—');
});
test('ASM PE units, default preset, duration rejection and STESS maximum', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await fillPatient(page); await page.locator('[data-tab="asm"]').click(); await expect(page.locator('#asmLoadOut')).toHaveText('3600 mg');
  await page.locator('#asmDrug').selectOption('fpht'); await expect(page.locator('#asmDoseOut')).toHaveText('20 mg PE/kg'); await expect(page.locator('#asmLoadOut')).toHaveText('1200 mg PE');
  await page.locator('#asmMinutes').fill('0'); await expect(page.locator('#asmRateOut')).toHaveText('—');
  await page.locator('[data-tab="scores"]').click(); await page.locator('#stessAge').check(); await page.locator('#stessNoHx').check();
  await page.locator('#stessType').selectOption('2'); await page.locator('#stessCon').selectOption('1'); await expect(page.locator('#stessOut')).toHaveText('6/6');
});
test('case labels are text and new cases clear patient context', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await fillPatient(page); await page.locator('#caseOptions summary').click(); await page.locator('#patientName').fill('<img src=x onerror=alert(1)>'); await page.locator('#savePatient').click();
  await expect(page.locator('#patientSelect option').last()).toContainText('<img'); expect(await page.locator('#patientSelect img').count()).toBe(0);
  await page.locator('[data-tab="asm"]').click(); await page.locator('#warn_renal').check(); await page.locator('[data-tab="sedation"]').click(); await page.locator('#newCase').click();
  await expect(page.locator('#wt')).toHaveValue(''); await expect(page.locator('#warn_renal')).not.toBeChecked(); await page.locator('#clearCases').click();
  expect(await page.evaluate(() => localStorage.getItem('se-calculator-patient-profiles-v1'))).toBeNull();
});
test('invalid Admin import cannot change calculations', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await fillPatient(page); await page.locator('[data-tab="admin"]').click(); await page.locator('#importConfig').fill('{"sedatives":{},"asms":{}}'); await page.locator('#applyImport').click();
  await expect(page.locator('#adminStatus')).toContainText('Import failed'); await expect(page.locator('#rateOut')).toHaveText('10 mL/hr');
  expect(await page.evaluate(() => localStorage.getItem('se-calculator-admin-config-v1'))).toBeNull();
});
test('changing the primary drug preserves its own concentration and resets dose units', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await fillPatient(page);
  await page.locator('#sedativeChecks input[value="propofol"]').check();
  await page.locator('#compare_propofol_mg').fill('1000'); await page.locator('#compare_propofol_ml').fill('100');
  await page.locator('#sedativeChecks input[value="midazolam"]').uncheck();
  await page.locator('#sedativeChecks input[value="ketamine"]').uncheck();
  await expect(page.locator('#baseMixMg')).toHaveValue('1000'); await expect(page.locator('#mixMl')).toHaveValue('100');
  await expect(page.locator('#rateDose')).toHaveValue('20'); await expect(page.locator('#rateOut')).toHaveText('7.2 mL/hr');
});
test('PWA caches privacy separately and calculator reloads offline', async ({ page, context }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await page.evaluate(() => navigator.serviceWorker.ready);
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
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; });
  await expect(page.locator('#patientSelect')).toHaveValue('legacy-case');
  await expect(page.locator('#wt')).toHaveValue('60');
  await expect(page.locator('#rateOut')).toHaveText('20 mL/hr');
  await expect(page.locator('#appVersion')).toContainText('v0.4.0');
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
      return names.includes('se-calculator-0.4.0-web-20261022-1') && !names.includes('se-calculator-2026-07-v8');
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
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; });
  await expect(page.locator('#bodyOptions')).not.toHaveAttribute('open', '');
  await expect(page.locator('#scaledMixResults')).toBeEmpty();
  await page.locator('#wt').fill('60');
  await expect(page.locator('#ht')).toHaveValue('');
  for (const [volume, mg] of [[100,60],[250,150],[500,300],[1000,600]]) {
    const row = page.locator(`#oneMixTable tr[data-volume="${volume}"]`);
    await expect(row.locator('td')).toHaveText([`${mg} mg`, `${mg} mg`]);
  }
  await expect(page.locator('#midazolamMixMg')).toHaveText('300 mg');
  await expect(page.locator('#ketamineMixMg')).toHaveText('300 mg');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await expect(page.locator('#ketamineLoadingOut')).toHaveText('60 mg');
  const midaz01 = page.locator('#autoRateTable tr[data-drug="midazolam"][data-dose="0.1"]');
  await expect(midaz01).toContainText('10 mL/hr');
  await page.locator('#fluidPreset').selectOption('1000');
  await expect(page.locator('#midazolamMixMg')).toHaveText('600 mg');
  await expect(midaz01).toContainText('10 mL/hr');
  await page.locator('#mixMultiplier').selectOption('10');
  await expect(page.locator('#midazolamMixMg')).toHaveText('6000 mg');
  await expect(midaz01).toContainText('1 mL/hr');
  await expect(page.locator('#mixEquivalent')).toContainText('10 mL/hr = 1 mg/kg/hr');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await page.locator('#fluidPreset').selectOption('250');
  await expect(page.locator('#midazolamMixMg')).toHaveText('1500 mg');
  await page.locator('#wt').fill('70');
  await expect(page.locator('#midazolamMixMg')).toHaveText('1750 mg');
  await expect(page.locator('#ketamineLoadingOut')).toHaveText('70 mg');
  await expect(midaz01).toContainText('1 mL/hr');
  await expect(page.locator('#infusionOptions')).not.toHaveAttribute('open', '');
  expect(errors).toEqual([]);
});

test('optional height cannot block actual-weight results; selecting derived weight requires height', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await page.locator('#wt').fill('60');
  await page.locator('#bodyOptions summary').click();
  await page.locator('#ht').fill('0');
  await expect(page.locator('#midazolamMixMg')).toHaveText('300 mg');
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
  await expect(page.locator('#midazolamMixMg')).toHaveText('300 mg');
});

test('invalid weight clears every weight-derived result; an invalid manual mixture leaves shooting independent', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await fillPatient(page);
  await page.locator('#mixMl').fill('0');
  await expect(page.locator('#rateOut')).toHaveText('—');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await expect(page.locator('#midazolamMixMg')).toHaveText('혼합액 입력 필요');
  for (const value of ['', '0', '-1', '501']) {
    await page.locator('#wt').fill(value);
    for (const id of ['oneMixTable','scaledMixResults','rateTable','flowOverviewTable','mixtureSummary','loadOut']) await expect(page.locator('#' + id)).toBeEmpty();
    await expect(page.locator('#asmLoadOut')).toHaveText('—');
  }
});

test('a case with weight only saves and reloads without requiring optional fields', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await page.locator('#wt').fill('60');
  await page.locator('#caseOptions summary').click(); await page.locator('#patientName').fill('Weight only');
  await page.locator('#savePatient').click();
  await expect(page.locator('#caseStatus')).toContainText('저장했습니다');
  await page.reload();
  await expect(page.locator('#wt')).toHaveValue('60'); await expect(page.locator('#ht')).toHaveValue('');
  await expect(page.locator('#midazolamMixMg')).toHaveText('300 mg');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
});

test('flow titration, bag size and N-fold concentration have distinct effects', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await page.locator('#wt').fill('60');
  await page.locator('#fluidPreset').selectOption('100');
  const flow = page.locator('#midazolamFlow');
  await flow.fill(''); await flow.pressSequentially('40');
  await expect(flow).toBeFocused(); await expect(flow).toHaveValue('40');
  await expect(page.locator('#midazolamFlowDose')).toHaveText('0.4 mg/kg/hr');
  await expect(page.locator('#midazolamDailyFluid')).toHaveText('960 mL/24 hr');
  await expect(page.locator('#midazolamBagDuration')).toHaveText('2시간 30분');
  await page.locator('#ketamineFlow').fill('100');
  await expect(page.locator('#ketamineFlowDose')).toHaveText('1 mg/kg/hr');
  await page.locator('#fluidPreset').selectOption('1000');
  await expect(flow).toHaveValue('40');
  await expect(page.locator('#midazolamFlowDose')).toHaveText('0.4 mg/kg/hr');
  await expect(page.locator('#midazolamDailyFluid')).toHaveText('960 mL/24 hr');
  await expect(page.locator('#midazolamBagDuration')).toHaveText('25시간');
  await page.locator('#mixMultiplier').selectOption('2');
  await expect(flow).toHaveValue('20');
  await expect(page.locator('#ketamineFlow')).toHaveValue('50');
  await expect(page.locator('#midazolamFlowDose')).toHaveText('0.4 mg/kg/hr');
  await expect(page.locator('#ketamineFlowDose')).toHaveText('1 mg/kg/hr');
  await expect(page.locator('#midazolamDailyFluid')).toHaveText('480 mL/24 hr');
  await expect(page.locator('#midazolamBagDuration')).toHaveText('50시간');
  await page.locator('#mixMultiplier').selectOption('3');
  await expect(page.locator('#midazolamFlowDose')).toHaveText('0.4 mg/kg/hr');
  await page.locator('#mixMultiplier').selectOption('1');
  await expect(flow).toHaveValue('40'); await expect(page.locator('#ketamineFlow')).toHaveValue('100');
  await flow.fill('5'); await expect(page.locator('#midazolamFlowDose')).toHaveText('0.05 mg/kg/hr');
  await expect(page.locator('#midazolamLoadingOut')).toHaveText('12 mg');
  await expect(page.locator('#ketamineLoadingOut')).toHaveText('60 mg');
  expect(errors).toEqual([]);
});

test('invalid or zero flow does not leave stale dose or fluid results', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await page.locator('#wt').fill('60');
  const flow = page.locator('#midazolamFlow');
  await flow.fill('40');
  for (const value of ['', '-1', '1e308']) {
    await flow.fill(value);
    for (const suffix of ['FlowDose','DailyFluid','BagDuration']) await expect(page.locator('#midazolam' + suffix)).toHaveText('—');
    await expect(page.locator('#midazolamFlowError')).toBeVisible();
    await expect(page.locator('#ketamineFlowDose')).toHaveText('0.1 mg/kg/hr');
    await expect(page.locator('#midazolamMixMg')).toHaveText('300 mg');
  }
  await flow.fill(''); await page.locator('#mixMultiplier').selectOption('2');
  await expect(flow).toHaveValue(''); await expect(page.locator('#midazolamFlowDose')).toHaveText('—');
  await flow.fill('0');
  await expect(page.locator('#midazolamFlowDose')).toHaveText('0 mg/kg/hr');
  await expect(page.locator('#midazolamDailyFluid')).toHaveText('0 mL/24 hr');
  await expect(page.locator('#midazolamBagDuration')).toHaveText('— (0 mL/hr)');
  await expect(page.locator('#midazolamFlowError')).toBeHidden();
});

test('a new case clears prior flow and mix planning', async ({ page }) => {
  await page.goto('/'); await page.locator('#flowDetails').evaluate(el => { el.open = true; }); await page.locator('#wt').fill('60');
  await page.locator('#midazolamFlow').fill('40');
  await page.locator('#ketamineFlow').fill('100');
  await page.locator('#mixMultiplier').selectOption('2');
  await page.locator('#caseOptions summary').click(); await page.locator('#newCase').click();
  await expect(page.locator('#scaledMixResults')).toBeEmpty();
  await page.locator('#wt').fill('70');
  await expect(page.locator('#mixMultiplier')).toHaveValue('1');
  await expect(page.locator('#midazolamFlow')).toHaveValue('10');
  await expect(page.locator('#ketamineFlow')).toHaveValue('10');
  await expect(page.locator('#midazolamFlowDose')).toHaveText('0.1 mg/kg/hr');
});


test('default overview needs only weight, fluid size and multiplier, without optional speed or dose', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#sedativeChecks')).toBeVisible();
  await expect(page.locator('#flowDetails')).not.toHaveAttribute('open', '');
  await page.locator('#wt').fill('60');
  await expect(page.locator('#flowOverviewTable')).toBeVisible();
  await expect(page.locator('#flowOverviewTable tbody tr')).toHaveCount(30);
  const doseAt40 = page.locator('#flowOverviewTable tr[data-flow="40"] td');
  await expect(doseAt40).toHaveText(['0.4','0.4']);
  await page.locator('#fluidPreset').selectOption('1000');
  await expect(doseAt40).toHaveText(['0.4','0.4']);
  await expect(page.locator('#mixtureSummary')).toContainText('600 mg / 1000 mL');
  await page.locator('#mixMultiplier').selectOption('2');
  await expect(doseAt40).toHaveText(['0.8','0.8']);
  await expect(page.locator('#mixtureSummary')).toContainText('1200 mg / 1000 mL');
  await page.locator('#infusionOptions summary').click();
  await page.locator('#rateDose').fill('');
  await expect(doseAt40).toHaveText(['0.8','0.8']);
  await expect(page.locator('#rateTable tr[data-drug="midazolam"]')).toHaveCount(40);
  await page.locator('#flowDetails summary').click();
  await page.locator('#midazolamFlow').fill('');
  await expect(doseAt40).toHaveText(['0.8','0.8']);
  await page.locator('#wt').fill('');
  await expect(page.locator('#flowOverviewTable')).toBeEmpty();
});

test('every sedative appears in both tables and separate loading with its own concentration and N-fold mix', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/'); await page.locator('#wt').fill('60');
  for (const [key,mg,ml] of [['propofol',1000,100],['pentobarbital',500,50],['thiopental',1000,100]]) {
    await page.locator(`#sedativeChecks input[value="${key}"]`).check();
    await expect(page.locator(`#flowOverviewTable tr[data-flow="30"] td[data-drug="${key}"]`)).toHaveText('혼합액 입력 필요');
    await page.locator(`#compare_${key}_mg`).fill(String(mg));
    await page.locator(`#compare_${key}_ml`).fill(String(ml));
  }
  const flowRow = page.locator('#flowOverviewTable tr[data-flow="30"]');
  await expect(flowRow.locator('td[data-drug="propofol"] .native-dose')).toHaveText('83.33 mcg/kg/min');
  expect(await flowRow.locator('td[data-drug="propofol"]').evaluate(el => el.firstChild.textContent)).toBe('5');
  await expect(flowRow.locator('td[data-drug="pentobarbital"]')).toHaveText('5');
  await expect(flowRow.locator('td[data-drug="thiopental"]')).toHaveText('5');
  for (const [key,mg] of [['propofol',120],['pentobarbital',300],['thiopental',180]]) {
    await expect(page.locator(`#${key}LoadingOut`)).toHaveText(`${mg} mg`);
    expect(await page.locator(`#rateTable tr[data-drug="${key}"]`).count()).toBeGreaterThan(10);
  }
  await page.locator('#flowDetails summary').click();
  await page.locator('#propofolFlow').fill('30');
  await expect(page.locator('#propofolFlowDose')).toHaveText('5 mg/kg/hr · 83.33 mcg/kg/min');
  await expect(page.locator('#propofolDailyFluid')).toHaveText('720 mL/24 hr');
  await expect(page.locator('#propofolBagDuration')).toHaveText('3시간 20분');
  await page.locator('#mixMultiplier').selectOption('2');
  await expect(flowRow.locator('td[data-drug="propofol"] .native-dose')).toHaveText('166.67 mcg/kg/min');
  expect(await flowRow.locator('td[data-drug="propofol"]').evaluate(el => el.firstChild.textContent)).toBe('10');
  await expect(page.locator('#propofolFlow')).toHaveValue('15');
  await expect(page.locator('#propofolFlowDose')).toHaveText('5 mg/kg/hr · 83.33 mcg/kg/min');
  await expect(page.locator('#propofolMixMg')).toHaveText('2000 mg');
  // Moving an independently mixed drug into the primary position must not inherit MDZ concentration or apply N twice.
  await page.locator('#sedativeChecks input[value="midazolam"]').uncheck();
  await page.locator('#sedativeChecks input[value="ketamine"]').uncheck();
  await expect(page.locator('#baseMixMg')).toHaveValue('1000');
  await expect(page.locator('#mixMg')).toHaveValue('2000');
  await expect(page.locator('#mixMl')).toHaveValue('100');
  await expect(page.locator('#propofolFlowDose')).toHaveText('5 mg/kg/hr · 83.33 mcg/kg/min');
  await page.locator('#mixMl').fill('');
  await expect(flowRow.locator('td[data-drug="propofol"]')).toHaveText('혼합액 입력 필요');
  await expect(flowRow.locator('td[data-drug="pentobarbital"]')).toHaveText('10');
  await expect(page.locator('#propofolLoadingOut')).toHaveText('120 mg');
  expect(errors).toEqual([]);
});

test('ASM warning flags highlight related drugs and selected results without changing loading doses', async ({ page }) => {
  await page.goto('/'); await page.locator('#wt').fill('60');
  await expect(page.locator('[data-tab="warnings"]')).toHaveCount(0);
  await page.locator('[data-tab="asm"]').click();
  await expect(page.locator('#warningChecks')).toBeVisible();
  const lev = page.locator('#asmAll tr[data-asm="lev"]');
  const vpa = page.locator('#asmAll tr[data-asm="vpa"]');
  await page.locator('#warn_renal').check();
  await expect(lev).toHaveClass('asm-caution-row');
  await expect(page.locator('#asmCautions')).toContainText('유지용량');
  await expect(page.locator('#asmCautions')).toContainText('자동 감량하지 않습니다');
  await expect(page.locator('#asmLoadOut')).toHaveText('3600 mg');
  await expect(vpa).not.toHaveClass('asm-caution-row');
  await page.locator('#warn_hepatic').check(); await page.locator('#warn_carbapenem').check();
  await expect(vpa).toHaveClass('asm-caution-row');
  await page.locator('#asmDrug').selectOption('vpa');
  await expect(page.locator('#asmCautions')).toContainText('주의 2건');
  await expect(page.locator('#asmCautions')).toContainText('농도가 크게 감소');
  await expect(page.locator('#asmLoadOut')).toHaveText('2400 mg');
  await page.locator('#warn_cardiac').check();
  for (const key of ['pht','fpht','lac']) await expect(page.locator(`#asmAll tr[data-asm="${key}"]`)).toHaveClass('asm-caution-row');
  await expect(page.locator('#asmAll tr[data-asm="pb"]')).not.toHaveClass('asm-caution-row');
  await page.locator('#asmDrug').selectOption('lac'); await expect(page.locator('#asmCautions')).toContainText('PR 연장');
  await page.locator('#warn_cardiac').uncheck(); await expect(page.locator('#asmCautions')).toContainText('확인되었다는 뜻은 아니며');
  for (const key of ['pht','fpht','lac']) await expect(page.locator(`#asmAll tr[data-asm="${key}"]`)).not.toHaveClass('asm-caution-row');
  await page.locator('#warn_shock').check(); await expect(page.locator('#asmAll tr[data-asm="pb"]')).toHaveClass('asm-caution-row');
  await page.locator('#warn_dravet').check(); await expect(page.locator('#asmCautions')).toContainText('나트륨통로');
  await page.locator('#asmDrug').selectOption('vpa');
  await page.locator('#warn_platelet').check(); await page.locator('#warn_preg').check();
  await expect(page.locator('#asmCautions')).toContainText('단회 응급투여');
  await expect(page.locator('#asmCautions')).toContainText('혈소판');
  await page.locator('[data-tab="sedation"]').click(); await page.locator('#caseOptions summary').click(); await page.locator('#newCase').click();
  await page.locator('[data-tab="asm"]').click();
  await expect(page.locator('#warningChecks input:checked')).toHaveCount(0);
  await expect(page.locator('#asmCautions')).not.toContainText('주의 2건');
});


test('a saved nonautomatic primary never inherits the default mixture; notes remain available before entering concentration', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('se-calculator-admin-config-v1', JSON.stringify({
    sedatives: JSON.parse(document.getElementById('sedativeConfig').value),
    asms: JSON.parse(document.getElementById('asmConfig').value),
    selectedSedatives: ['propofol','pentobarbital']
  })));
  await page.reload(); await page.locator('#wt').fill('60');
  await expect(page.locator('#baseMixMg')).toHaveValue('');
  await expect(page.locator('#mixMl')).toHaveValue('');
  await expect(page.locator('#flowOverviewTable tr[data-flow="30"] td[data-drug="propofol"]')).toHaveText('혼합액 입력 필요');
  await expect(page.locator('#rateOut')).toHaveText('—');
  await expect(page.locator('#propofolLoadingOut')).toHaveText('120 mg');
  await page.locator('#infusionOptions summary').click();
  await expect(page.locator('#sedNotes')).toContainText('PRIS');
  await expect(page.locator('#sedNotes')).toContainText('Pentobarbital');
  await page.locator('#baseMixMg').fill('1000'); await page.locator('#mixMl').fill('100');
  await expect(page.locator('#flowOverviewTable tr[data-flow="30"] td[data-drug="propofol"] .native-dose')).toHaveText('83.33 mcg/kg/min');
  await expect(page.locator('#rateOut')).toHaveText('7.2 mL/hr');
  await expect(page.locator('#flowOverviewTable tr[data-flow="30"] td[data-drug="pentobarbital"]')).toHaveText('혼합액 입력 필요');
});
