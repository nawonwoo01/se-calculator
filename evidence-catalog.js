(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.SEEvidence = data;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const reviewedAt = '2026-10-22';
  const sources = {
    ncs2012: { reviewedAt: '2026-10-22', label: 'NCS 2012', title: 'Brophy et al. Guidelines for the Evaluation and Management of Status Epilepticus. Table 8.', published: '2012', url: 'https://icu.smhs.gwu.edu/sites/g/files/zaskib1161/files/2025-01/status_epilepticus_guidelines_neurocriticalcare.pdf', scope: 'RSE 지속주입; EEG·기도·혈압 감시. 문헌 범위 안의 선택값은 개별 환자의 권장 시작량을 뜻하지 않음.' },
    sop2022: { reviewedAt: '2026-10-22', label: 'Malter SOP 2022', title: 'Malter MP, Neuneier J. Super-refractory status epilepticus in adults. Table 1. Neurol Res Pract. 2022;4:35.', published: '2022-08-22', url: 'https://doi.org/10.1186/s42466-022-00199-4', scope: '성인 RSE/SRSE의 실무 SOP; 비교 우월성·고수준 근거 확정 아님. 표의 24시간 문맥을 장기 유지 권고로 확대하지 않음.' },
    propLabel: { reviewedAt: '2026-10-22', label: 'Propofol DailyMed', title: 'Propofol injectable emulsion, USP: strengths, compatibility and dilution.', published: '개정일 별도 확인', url: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=3acf8e6c-827d-11e2-9e96-0800200c9a66', scope: '제제·농도 근거. RSE 용량 근거와 구분. 10 mg/mL 완제품; 무균 취급·제품별 교체 기준 확인.' },
    pentLabel: { reviewedAt: '2026-10-22', label: 'Hikma DailyMed 2024', title: 'Pentobarbital Sodium Injection, USP: description, IV administration and supplied presentations.', published: '2024-03-08', url: 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=d375b92a-baa1-4d63-9ad1-1467dcfde7d5&type=display', scope: '50 mg/mL 제제. 해당 라벨은 다른 약물·용액과 혼합하지 않도록 명시. RSE 지속주입 용량은 NCS와 별개 출처이며 제품 허가 확대를 뜻하지 않음.' },
    thioSmPC: { reviewedAt: '2026-10-22', label: 'Panpharma SmPC 2024', title: 'Thiopental 500 mg: SmPC sections 4.2, 6.3 and 6.6.', published: '2024-02-12', url: 'https://www.medicines.org.uk/emc/product/9376/smpc', scope: '지속주입 제제 농도 0.2%/0.4%와 NS/D5W 조제 근거. RSE 용량은 별도 지침. 중심정맥, 강알칼리성·침전·제품 안정성 확인.' }
  };
  const profiles = {
    propofol: [
      { id: 'ncs2012', source: 'ncs2012', unit: 'mcg/kg/min', min: 30, max: 200, step: 10, doses: [20,30,50,65,80,100,150,200], defaultDose: 20, startDose: 20, loads: [1,2], defaultLoad: 2, note: '20 mcg/kg/min은 시작값, 30–200은 유지 범위. 고용량·장시간 PRIS 및 저혈압·호흡억제 감시.' },
      { id: 'sop2022', source: 'sop2022', unit: 'mg/kg/hr', min: 4, max: 10, step: 0.5, doses: [4,5,6,7,8,9,10], defaultDose: 4, loads: [2], defaultLoad: 2, note: '성인 SOP의 4–10 mg/kg/hr·24시간 문맥. 이전 mcg/kg/min 값과 단위를 혼동하지 말고 PRIS·혈역학 감시.' }
    ],
    pentobarbital: [
      { id: 'ncs2012', source: 'ncs2012', unit: 'mg/kg/hr', min: 0.5, max: 5, step: 0.1, doses: [0.5,1,2,3,4,5], defaultDose: 0.5, loads: [5,10,15], defaultLoad: 5, note: 'NCS loading 범위 5–15 mg/kg(≤50 mg/min), 유지 0.5–5 mg/kg/hr. 단회 선택값이며 추가·누적 loading을 자동 지시하지 않음. 호흡·심장 억제, 저혈압·장마비·propylene glycol 주의.' }
    ],
    thiopental: [
      { id: 'ncs2012', source: 'ncs2012', unit: 'mg/kg/hr', min: 0.5, max: 5, step: 0.1, doses: [0.5,1,2,3,4,5], defaultDose: 0.5, loads: [2,3,5,7], defaultLoad: 3, note: 'NCS loading 범위 2–7 mg/kg(≤50 mg/min) 안의 선택값. 저혈압·호흡/심장 억제, 축적에 주의. 단회 계산이며 반복·누적량과 속도는 별도 확인.' },
      { id: 'sop2022', source: 'sop2022', unit: 'mg/kg/hr', min: 3, max: 7, step: 0.5, doses: [3,4,5,6,7], defaultDose: 3, loads: [5], defaultLoad: 5, note: '성인 SOP: loading 5 mg/kg, 유지 약3–7 mg/kg/hr·24시간 문맥. NCS와 범위가 다르며 더 높은 용량의 우월성 근거가 아님.' }
    ]
  };
  const preparations = {
    propofol: { source: 'propLabel', concentrations: [10], volumes: [20,50,100], defaultVolume: 100, note: '10 mg/mL 완제품을 그대로 사용하는 계산입니다. MDZ/Ket N배를 적용하지 않으며 NS 대용량 수액에 혼합하는 안내가 아닙니다.' },
    pentobarbital: { source: 'pentLabel', concentrations: [50], volumes: [20,50], defaultVolume: 20, note: '해당 제품의 50 mg/mL 원액 기준입니다. 라벨상 다른 용액과 혼합 금지. N배 농축·희석을 적용하지 않습니다. 국내 제제·기관의 지속주입 적합성을 확인하세요.' },
    thiopental: { source: 'thioSmPC', concentrations: [2,4], volumes: [100,250,500,1000], defaultVolume: 250, note: '0.2%(2 mg/mL) 또는0.4%(4 mg/mL) 조제 선택. 최종 부피 기준이며 NS0.9%/D5W·중심정맥·9시간 실온 안정성 등 해당 제품 기준을 확인하세요. MDZ/Ket N배와 독립적입니다.' }
  };
  const history = [
    { date: reviewedAt, drug: 'Propofol', before: '20–200 mcg/kg/min · 수동 농도 입력', after: 'NCS 시작20/유지30–200 및 SOP4–10 mg/kg/hr를 구분해 선택; 10 mg/mL 자동', considerations: '시작/유지 구분, 0.06 단위 변환, 고용량 PRIS·기간/혈역학 감시. SOP를 더 최신이라는 이유로 기본 범위에 합치지 않음.', sources: ['ncs2012','sop2022','propLabel'] },
    { date: reviewedAt, drug: 'Pentobarbital', before: 'loading5 · 유지0.5–5 mg/kg/hr · 수동 농도 입력', after: 'NCS loading5/10/15 선택, 유지 범위 보존; 50 mg/mL 제제 자동', considerations: 'loading 범위와 단회 선택을 구분. 50 mg/mL는 제제 근거이며 RSE 용량 근거/허가와 별개. 혼합 금지·용매 독성·기관 제제 확인.', sources: ['ncs2012','pentLabel'] },
    { date: reviewedAt, drug: 'Thiopental', before: 'loading3 · 유지0.5–5 mg/kg/hr · 수동 농도 입력', after: 'NCS2–7 loading/0.5–5 유지와 SOP5 loading/3–7 유지 선택; 2/4 mg/mL 자동', considerations: '기존 기본 선택3 mg/kg 보존. NCS/SOP 차이·중심정맥·강알칼리성·안정성. 농도 SmPC를 SE 용량 권고로 해석하지 않음.', sources: ['ncs2012','sop2022','thioSmPC'] }
  ];
  return { reviewedAt, sources, profiles, preparations, history };
});
