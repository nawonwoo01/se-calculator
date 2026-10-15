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
test('STESS combinations stay within 0–6; stupor/coma contributes 1', () => {
  assert.equal(core.stess(true, true, 2, 1), 6);
  assert.equal(core.stess(false, false, 0, 1), 1);
  for (const age of [false, true]) for (const hx of [false, true]) for (const type of [0, 1, 2]) for (const con of [0, 1]) assert.ok(core.stess(age, hx, type, con) <= 6);
  assert.throws(() => core.stess(true, true, 2, 2));
});
