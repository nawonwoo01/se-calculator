const { test, expect } = require('@playwright/test');
async function fillPatient(page) { await page.locator('#wt').fill('60'); await page.locator('#ht').fill('170'); }
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
  await page.goto('/'); await fillPatient(page); await page.locator('#patientName').fill('<img src=x onerror=alert(1)>'); await page.locator('#savePatient').click();
  await expect(page.locator('#patientSelect option').last()).toContainText('<img'); expect(await page.locator('#patientSelect img').count()).toBe(0);
  await page.locator('[data-tab="warnings"]').click(); await page.locator('#warn_renal').check(); await page.locator('[data-tab="sedation"]').click(); await page.locator('#newCase').click();
  await expect(page.locator('#wt')).toHaveValue(''); await expect(page.locator('#warn_renal')).not.toBeChecked(); await page.locator('#clearCases').click();
  expect(await page.evaluate(() => localStorage.getItem('se-calculator-patient-profiles-v1'))).toBeNull();
});
test('native bundle disables admin and persistent cases, works offline', async ({ page, context }) => {
  await page.goto('/www/index.html'); await fillPatient(page); await expect(page.locator('[data-tab="admin"]')).toBeHidden(); await expect(page.locator('.install-box')).toBeHidden();
  await page.locator('#patientName').fill('Case 1'); await page.locator('#savePatient').click(); expect(await page.evaluate(() => localStorage.getItem('se-calculator-patient-profiles-v1'))).toBeNull();
  await context.setOffline(true); await page.locator('#rateDose').fill('0.5'); await expect(page.locator('#rateOut')).toHaveText('25 mL/hr');
  await context.setOffline(false); await page.reload(); await expect(page.locator('#wt')).toHaveValue('');
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
