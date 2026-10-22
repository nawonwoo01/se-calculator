# 웹 계산기 임상 검토 기록

상태: 미검토. 리뷰어/소속, 검토일, 적용 기관 프로토콜, 최종 승인 범위를 기록해야 한다. 앱의 intended use는 의료전문가의 성인 계산 보조이며 소아 용량 계산을 지원하지 않는다.

## 원문/기관 프로토콜과 대조할 항목

| 항목 | 현재 번들 값/동작 | 확인할 사항 |
|---|---|---|
| LEV | 40/60 mg/kg, cap 4500 mg, 10분 | ESETT regimen과 다른 투여 옵션의 근거, 신기능은 유지 용량 주의문만 제공 |
| fPHT | 20 mg PE/kg, cap 1500 mg PE, 10분 | PE 단위, 최대 투여 속도/ECG·BP 모니터링 |
| PHT | 20 mg/kg, cap 1500 mg, 30분 | 기관 최대량/최대 속도, NS 희석·extravasation 주의 |
| VPA | 20/30/40 mg/kg, cap 3000 mg, 20분 | 주입시간, 간질환·임신·혈소판·carbapenem 주의 |
| PB | 15/20 mg/kg, cap 2000 mg, 20분 | 상한량과 기관 투여 속도·기도 관리 |
| LAC | fixed 200/400 mg, 10분 | SE에서 off-label 여부/근거, PR·AV block 주의 |
| Midazolam | load 0.2 mg/kg, table 0.05–2 mg/kg/hr | loading 반복/최대량, 기관 유지 범위 |
| Ketamine | load 1 mg/kg, text 1.5–10, table 0.5–10 mg/kg/hr | 기존 text/table 범위 차이를 검토하여 의도한 기준 확정 |
| Propofol | load 2 mg/kg, 20–200 mcg/kg/min | 기관 상한·PRIS·투여기간 주의, 변환계수 0.06 |
| Barbiturates | pentobarbital load 5, thiopental load 3 mg/kg; 0.5–5 mg/kg/hr | 누적 loading regimen과 table 범위, 기관 모니터링 |
| 체중식 | actual/Devine IBW/Janmahasatian LBW/AdjBW 0.4 | 성별·비만·저체중과 약제별 적절한 체중, 신장 입력 범위는 개발 검증용 제한 |
| 자동 혼합 농도 | 체중kg × 최종 부피mL /100 × N = 각 약제mg | 사용자가 지정한 1배 정의이며 임상 표준 농도·희석 안정성 승인이 아님. 실제 제제 농도·최종 부피·수액 부하 확인 |
| 주입속도·수액량 | cc/hr → mg/kg/hr 역산, 현재 속도×24시간, 최종 부피/속도, 배수 변경 시 동일 용량의 속도 환산 | 각 약제 혼합액만 계산. 소진시간은 약제 안정성·실제 허용 교체시간이 아님. 실제 펌프 설정은 별도로 확인 |
| SeLECT | 0–9, early 3/cortical 2/NIHSS 0–2/LAA 1/MCA 1 | original SeLECT와 SeLECT 2.0을 혼동하지 않을 것. 확률표는 구현하지 않음 |
| CAVE | 0–4, 원 코호트 근사 위험값 | early seizure 기간·ICH volume cutoff·예측 대상과 기간 명시 |
| STESS | age ≥65 2/no history 1/type 0–2/stupor or coma 1, 총 0–6 | 기존 coma 2 오류 수정. 원문의 항목 정의·임상 해석 대조 |

사용자가 바꾸는 ASM 주입 시간에 대해 허용 최대 속도 자동 제한은 아직 없다. 신장/간 기능에 따른 용량 자동 보정도 없다. 이 범위와 기관 프로토콜의 차이는 출시 전에 명확히 정해야 한다. 경고 체크가 선택되지 않았다고 금기가 없다는 의미로 표시하면 안 된다.

## 독립 산술 확인 예

| 예제 | 기대값 |
|---|---|
| Midazolam 0.2 mg/kg/hr ×60 kg, 600 mg/500 mL | 12 mg/hr ÷1.2 mg/mL =10 mL/hr |
| 자동1배 ×60 kg, 100 mL | 60 mg/100 mL. 10 mL/hr는 0.1 mg/kg/hr |
| 자동10배 ×60 kg, 500 mL | 3,000 mg/500 mL. 0.1 mg/kg/hr는 1 mL/hr |
| 60 kg·1배·40 mL/hr | 0.4 mg/kg/hr, 960 mL/24 hr. 100 mL는 2.5시간, 1,000 mL는 25시간에 계산상 소진 |
| 같은 용량에서 2배 전환 | 20 mL/hr, 0.4 mg/kg/hr 유지, 480 mL/24 hr |
| Shooting ×60 kg | 기존 Midazolam0.2 mg/kg =12 mg, Ketamine1 mg/kg =60 mg. 혼합 배수와 무관 |
| Propofol 50 mcg/kg/min ×60 kg, 1000 mg/100 mL | 3 mg/kg/hr ×60 kg ÷10 mg/mL =18 mL/hr |
| LEV 60 mg/kg ×100 kg, cap4500, 10분 | 4500 mg, 450 mg/min |
| fPHT 20 mg PE/kg ×60 kg, 10분 | 1200 mg PE, 120 mg PE/min |
| STESS 모든 최고 항목 | 2+1+2+1 =6 |

원문 대조, 경계값, 기관별 약품 농도, 실제 기기 표시(반올림 포함)를 확인한 후 이 문서에 리뷰어·일자·승인 범위를 기록한다. 기존 2025 참고문헌 일부는 서지정보가 불완전하며 최종 근거 목록을 확인해야 한다. 원문을 보지 않고 근거 확인 완료로 기록하지 않는다.

## 2026-10-22 첨부 계산기 대조 · 0.4.0

사용자 제공 `AED loading dose calculator by WWL.xlsx`는 UI/혼합 산술의 비교 자료이며 임상 승인 문서로 취급하지 않는다. B7=65 kg, B8=500 mL, B9=4배에서 M8=325 mg, M9=1300 mg, M10=2.5 mL/hr(0.1 mg/kg/hr)가 현재 자동 mix 정의와 일치한다.

다음 차이는 이번 UI 변경에서 기본값에 반영하지 않았으며 원문·기관 프로토콜 확인이 필요하다.

- Excel ketamine loading에는0.5 mg/kg 및1–2 mg/kg 대안이 함께 있고 현재 앱은1 mg/kg다. Midazolam의 유지 범위도 Excel과 현재 설정이 다르다.
- PHT18/15 mg/kg와 현재20 mg/kg, fPHT27/22.5 mg/kg 질량 표현과 현재20 mg PE/kg는 직접 치환하면 안 된다. PE 단위를 유지한다.
- Excel의 LEV/VPA30분과 앱10/20분, PB 용량·상한 차이는 임의 갱신하지 않는다.
- 경구 Topiramate/Perampanel 및 기타 메모는 IV loading과 구분하고 별도 근거·적응/허가·경로·제품 확인 후 추가 여부를 판단한다.
- ‘신장 기능’ 경고는 LEV 유지용량/투석 관련 표시다. loading을 자동 감량하지 않는다. VPA 임신 경고는 장기 사용과 단회 응급 판단을 구분한다.
- Propofol과 barbiturate에 MDZ/Ketamine 자동1배 농도를 적용하지 않는다. 사용자별 실제1배 약물량/최종 부피를 독립 입력하고 N배는 그 농도의 산술 환산으로만 표시한다. 희석 적합성과 실제 제제 안정성을 확인한다.
