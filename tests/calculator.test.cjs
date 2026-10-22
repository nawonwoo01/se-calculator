const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../calculator-core.js');
test('known infusion conversions and independent concentrations', () => {
  assert.equal(core.infusion(0.2, 'mg/kg/hr', 60, 600, 500).mlHr, 10);
  const propofol = core.infusion(50, 'mcg/kg/min', 60, 1000, 100);
  assert.equal(propofol.mgKgHr, 3); assert.equal(propofol.mlHr, 18);
  assert.equal(core.infusion(2, 'mg/kg/hr', 60, 500, 50).mlHr, 12);
});
test('dose caps, fixed dose and infusion duration', () => {
  assert.deepEqual(core.loading(60, 'kg', 100, 4500, 10), { uncapped: 6000, capped: 4500, perMinute: 450 });
  assert.equal(core.loading(20, 'kg', 100, 1500, 10).capped, 1500);
  assert.equal(core.loading(40, 'kg', 100, 3000, 20).perMinute, 150);
  assert.equal(core.loading(400, 'fixed', 60, 400, 10).capped, 400);
});
test('invalid inputs never fall back to a clinical value', () => {
  for (const value of ['', 0, -1, NaN, Infinity, 'abc']) {
    assert.throws(() => core.infusion(0.2, 'mg/kg/hr', 60, 600, value));
    assert.throws(() => core.loading(60, 'kg', 60, 4500, value));
    assert.throws(() => core.weights(value, 170, 'male'));
  }
  assert.throws(() => core.weights(10, 40, 'male'));
  assert.throws(() => core.infusion(1, 'mg/kg/min', 60, 600, 500));
});
test('adult weight formulas', () => {
  const male = core.weights(100, 180, 'male');
  assert.ok(Math.abs(male.ibw - 74.9921259843) < 1e-8);
  assert.ok(Math.abs(male.adj - 84.9952755906) < 1e-8);
  assert.equal(core.weights(45, 170, 'female').adj, 45);
  assert.ok(core.weights(60, 170, 'female').lbw < core.weights(60, 170, 'male').lbw);
});
test('actual weight needs no height; derived weights are unavailable until height is supplied', () => {
  assert.deepEqual(core.weights(60, '', 'male'), { actual: 60, ibw: null, lbw: null, adj: null, bmi: null });
  assert.equal(core.weights(60, null, 'female').actual, 60);
  assert.throws(() => core.weights(501, '', 'male'));
  assert.ok(Math.abs(core.weights(60, 170, 'male').bmi - 20.7612456747) < 1e-8);
});
test('1x is weight mg per final 100 mL, with volume and multiplier scaling independently', () => {
  for (const weight of [45, 60, 83.5]) for (const volume of [100, 250, 500, 1000]) for (const factor of [1, 2, 5, 10]) {
    const mix = core.weightBasedMixture(weight, volume, factor);
    assert.equal(mix.drugMg, weight * volume / 100 * factor);
    assert.ok(Math.abs(mix.concentration - weight / 100 * factor) < 1e-12);
    assert.ok(Math.abs(mix.doseAt10MlHr - 0.1 * factor) < 1e-12);
    assert.ok(Math.abs(core.infusion(0.1, 'mg/kg/hr', weight, mix.drugMg, volume).mlHr - 10 / factor) < 1e-10);
  }
  // Corrected user example: 60 mg / 100 mL at 10 mL/hr is 0.1 mg/kg/hr.
  assert.equal(core.weightBasedMixture(60, 100).drugMg, 60);
  assert.equal(core.weightBasedMixture(60, 100).doseAt10MlHr, 0.1);
  assert.equal(core.weightBasedMixture(60, 1000).drugMg, 600);
  for (const invalid of ['', 0, -1, NaN, Infinity, 'abc']) {
    assert.throws(() => core.weightBasedMixture(invalid, 1000));
    assert.throws(() => core.weightBasedMixture(60, invalid));
    assert.throws(() => core.weightBasedMixture(60, 1000, invalid));
  }
});
test('STESS combinations stay within 0–6; stupor/coma contributes 1', () => {
  assert.equal(core.stess(true, true, 2, 1), 6);
  assert.equal(core.stess(false, false, 0, 1), 1);
  for (const age of [false, true]) for (const hx of [false, true]) for (const type of [0, 1, 2]) for (const con of [0, 1]) assert.ok(core.stess(age, hx, type, con) <= 6);
  assert.throws(() => core.stess(true, true, 2, 2));
});
test('flow determines delivered dose and daily fluid; bag volume changes depletion time', () => {
  assert.deepEqual(core.infusionFromFlow(40, 60, 60, 100), { doseMgKgHr: 0.4, dailyVolumeMl: 960, bagHours: 2.5 });
  assert.deepEqual(core.infusionFromFlow(40, 60, 600, 1000), { doseMgKgHr: 0.4, dailyVolumeMl: 960, bagHours: 25 });
  assert.deepEqual(core.infusionFromFlow(5, 60, 60, 100), { doseMgKgHr: 0.05, dailyVolumeMl: 120, bagHours: 20 });
});
test('increasing mix factor reduces flow and daily fluid at the same dose', () => {
  for (const factor of [1, 2, 3, 5, 10]) {
    const flow = core.flowForMultiplier(40, 1, factor);
    const mix = core.weightBasedMixture(60, 1000, factor);
    const result = core.infusionFromFlow(flow, 60, mix.drugMg, 1000);
    assert.ok(Math.abs(result.doseMgKgHr - 0.4) < 1e-12);
    assert.ok(Math.abs(result.dailyVolumeMl - 960 / factor) < 1e-10);
    assert.equal(core.flowForMultiplier(flow, factor, 1), 40);
  }
});
test('zero flow has zero dose/volume and no finite bag time; invalid flows are rejected', () => {
  assert.deepEqual(core.infusionFromFlow(0, 60, 60, 100), { doseMgKgHr: 0, dailyVolumeMl: 0, bagHours: null });
  assert.equal(core.flowForMultiplier(0, 1, 10), 0);
  for (const value of ['', null, -1, NaN, Infinity, 'abc']) {
    assert.throws(() => core.infusionFromFlow(value, 60, 60, 100));
    assert.throws(() => core.flowForMultiplier(value, 1, 2));
  }
  assert.throws(() => core.infusionFromFlow(1e308, 60, 60, 100));
  assert.throws(() => core.flowForMultiplier(40, 1, 0));
});
