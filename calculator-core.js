(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SECore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  function positive(value, name) {
    if (value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) <= 0) {
      throw new Error(`${name}: 0보다 큰 값을 입력하세요.`);
    }
    return Number(value);
  }
  function weights(weight, height, sex) {
    const actual = positive(weight, '체중 (kg)');
    if (actual > 500) throw new Error('성인 입력 범위(체중 ≤500 kg)를 확인하세요.');
    if (height === '' || height == null) return { actual, ibw: null, lbw: null, adj: null, bmi: null };
    const ht = positive(height, '키 (cm)');
    if (ht < 100 || ht > 250) throw new Error('성인 키 입력 범위(100–250 cm)를 확인하세요.');
    if (!['male', 'female'].includes(sex)) throw new Error('체중식에 사용할 성별을 선택하세요.');
    const bmi = actual / ((ht / 100) ** 2);
    const ibw = (sex === 'male' ? 50 : 45.5) + 2.3 * (ht / 2.54 - 60);
    const lbw = (9270 * actual) / (sex === 'male' ? 6680 + 216 * bmi : 8780 + 244 * bmi);
    const adj = actual > ibw ? ibw + 0.4 * (actual - ibw) : actual;
    return { actual, ibw, lbw, adj, bmi };
  }
  function infusion(dose, unit, weight, drugMg, volumeMl) {
    const rate = positive(dose, '용량');
    const wt = positive(weight, '투여 체중');
    const mg = positive(drugMg, '총 약물량 (mg)');
    const ml = positive(volumeMl, '최종 혼합 부피 (mL)');
    if (!['mg/kg/hr', 'mcg/kg/min'].includes(unit)) throw new Error('지원하지 않는 용량 단위입니다.');
    const mgKgHr = unit === 'mcg/kg/min' ? rate * 0.06 : rate;
    const concentration = mg / ml;
    const mlHr = mgKgHr * wt / concentration;
    if (![mgKgHr, concentration, mlHr].every(Number.isFinite)) throw new Error('입력값이 계산 범위를 초과했습니다.');
    return { mgKgHr, concentration, mlHr };
  }
  function weightBasedMixture(weight, volumeMl, multiplier = 1) {
    const wt = positive(weight, '투여 체중');
    const ml = positive(volumeMl, '최종 혼합 부피 (mL)');
    const factor = positive(multiplier, 'Mix 배수');
    // User-defined 1x: 1 mg per kg in a FINAL volume of 1,000 mL.
    // This defines a concentration, independently of a prescribed dose.
    const baseMg = wt * ml / 1000;
    const drugMg = baseMg * factor;
    const concentration = drugMg / ml;
    const doseAt10MlHr = 10 * concentration / wt;
    if (![baseMg, drugMg, concentration, doseAt10MlHr].every(v => Number.isFinite(v) && v > 0)) throw new Error('혼합액 입력값이 계산 범위를 초과했습니다.');
    return { baseMg, drugMg, concentration, doseAt10MlHr };
  }
  function loading(dose, kind, weight, cap, minutes) {
    if (!['kg', 'fixed'].includes(kind)) throw new Error('지원하지 않는 투여 방식입니다.');
    const val = positive(dose, '용량');
    const wt = positive(weight, '투여 체중');
    const max = positive(cap, '상한 용량');
    const mins = positive(minutes, '주입 시간 (분)');
    const uncapped = kind === 'fixed' ? val : val * wt;
    const capped = Math.min(uncapped, max);
    if (![uncapped, capped / mins].every(Number.isFinite)) throw new Error('입력값이 계산 범위를 초과했습니다.');
    return { uncapped, capped, perMinute: capped / mins };
  }
  function stess(age65, noHistory, type, consciousness) {
    if (![0, 1, 2].includes(Number(type)) || ![0, 1].includes(Number(consciousness))) throw new Error('STESS 항목을 확인하세요.');
    return (age65 ? 2 : 0) + (noHistory ? 1 : 0) + Number(type) + Number(consciousness);
  }
  function validateConfig(config) {
    const text = (value) => typeof value === 'string' && value.length > 0 && value.length < 12000;
    const numbers = (values) => Array.isArray(values) && values.length > 0 && values.length < 101 && values.every(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
    for (const group of ['sedatives', 'asms']) {
      if (!config?.[group] || typeof config[group] !== 'object' || Array.isArray(config[group])) throw new Error(`${group} 설정을 확인하세요.`);
      const entries = Object.entries(config[group]);
      if (!entries.length || entries.length > 30) throw new Error('약제 수를 확인하세요.');
      for (const [key, drug] of entries) {
        if (!/^[a-z][a-z0-9_]{0,39}$/.test(key) || !drug || !text(drug.label)) throw new Error('약제 이름을 확인하세요.');
        if (group === 'sedatives') {
          positive(drug.load, 'Loading');
          if (!['mg/kg/hr', 'mcg/kg/min'].includes(drug.unit) || !numbers(drug.quick) || !text(drug.notes) || !text(drug.range) || !/^#[0-9a-f]{6}$/i.test(drug.color)) throw new Error('Sedative 단위/범위를 확인하세요.');
          const t = drug.table;
          if (!t || ![t.min, t.max, t.step].every(v => typeof v === 'number' && Number.isFinite(v) && v > 0) || t.max < t.min || (t.max - t.min) / t.step > 1000) throw new Error('Rate table 범위를 확인하세요.');
        } else {
          if (!['mg', 'mg PE'].includes(drug.unit) || !text(drug.note) || !numbers(drug.fixed || drug.doses)) throw new Error('ASM 용량/단위를 확인하세요.');
          positive(drug.max, 'Max dose'); positive(drug.minutes, 'Infusion minutes');
        }
      }
    }
    if (config.selectedSedatives && (!Array.isArray(config.selectedSedatives) || config.selectedSedatives.some(k => !Object.hasOwn(config.sedatives, k)))) throw new Error('선택 약제를 확인하세요.');
    if (config.warningItems && (!Array.isArray(config.warningItems) || config.warningItems.length > 30 || config.warningItems.some(item => !Array.isArray(item) || item.length !== 3 || !/^[a-z][a-z0-9_]{0,39}$/.test(item[0]) || !text(item[1]) || !text(item[2])))) throw new Error('Warning 항목을 확인하세요.');
    if (config.evidenceText != null && !text(config.evidenceText)) throw new Error('근거 문구를 확인하세요.');
    return config;
  }
  return { positive, weights, infusion, weightBasedMixture, loading, stess, validateConfig };
});
