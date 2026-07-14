# Status Epilepticus ASM Loading / Sedative Infusion Calculator

뇌전증지속증(status epilepticus)에서 항경련제 loading dose와 refractory status epilepticus sedative infusion rate를 빠르게 확인하기 위한 정적 HTML/PWA 계산기입니다.

## 포함 기능

- 환자 체중/키/성별 기반 actual/IBW/LBW/AdjBW 계산
- Levetiracetam, fosphenytoin, phenytoin, valproate, phenobarbital, lacosamide loading dose 계산
- Midazolam, ketamine, propofol, pentobarbital, thiopental infusion rate 계산
- 여러 sedative를 체크박스로 동시에 선택해 색상별 rate table 비교
- Midazolam 0.05-2 mg/kg/hr 등 infusion range를 생략 없이 표로 표시
- Propofol mcg/kg/min to mg/kg/hr 자동 환산
- 환자별 warning/contraindication flag
- SeLECT, CAVE, STESS quick score
- Android/iPhone 홈 화면 추가 안내
- Admin 탭: 약제 파라미터, infusion table 범위, 근거 문구를 JSON으로 로컬 수정/내보내기/가져오기

## 다운로드 후 사용 방법

1. `se-calculator` 폴더 전체를 다운로드합니다.
2. Windows 또는 Mac에서 `index.html`을 더블클릭해 실행합니다.
3. 휴대폰에서는 폴더를 웹서버나 파일 앱을 통해 열 수 있지만, PWA 설치와 오프라인 캐시는 HTTPS 또는 로컬 서버에서 가장 안정적으로 동작합니다.
4. Android Chrome은 접속 후 `Install` 버튼 또는 브라우저 메뉴의 “홈 화면에 추가”를 선택합니다.
5. iPhone Safari는 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택합니다.

로컬 서버로 확인하려면 폴더 안에서 다음 명령을 실행합니다.

```bash
python -m http.server 8787
```

브라우저에서 `http://127.0.0.1:8787/index.html`에 접속합니다.

## Admin 탭 안내

정적 HTML 버전의 Admin 탭은 서버 데이터베이스를 바꾸지 않습니다. 저장값은 현재 브라우저의 `localStorage`에만 저장됩니다.

전체 사용자에게 같은 값을 배포하려면 Admin 탭에서 `Export JSON`으로 내보낸 뒤, 그 JSON을 기준으로 `index.html`의 기본 설정을 업데이트해야 합니다.

## 주요 참고문헌

1. Glauser T, Shinnar S, Gloss D, et al. Evidence-based guideline: Treatment of convulsive status epilepticus in children and adults. Epilepsy Curr. 2016;16(1):48-61.
2. Brophy GM, Bell R, Claassen J, et al. Guidelines for the evaluation and management of status epilepticus. Neurocrit Care. 2012;17(1):3-23.
3. Trinka E, Cock H, Hesdorffer D, et al. A definition and classification of status epilepticus: Report of the ILAE Task Force. Epilepsia. 2015;56(10):1515-1523.
4. Kapur J, Elm J, Chamberlain JM, et al. Randomized trial of three anticonvulsant medications for status epilepticus. N Engl J Med. 2019;381(22):2103-2113.
5. Chamberlain JM, Kapur J, Shinnar S, et al. Efficacy of levetiracetam, fosphenytoin, and valproate for established status epilepticus by age group. Lancet. 2020;395(10231):1217-1224.
6. Woodward HJ, et al. Status epilepticus in older adults: A critical review. Epilepsia. 2025.
7. Joshi S, Kapur J. Status epilepticus: Updates on mechanisms and treatments. Epilepsia Open. 2025.
8. Galovic M, Dohler N, Erdelyi-Canavese B, et al. Prediction of late seizures after ischaemic stroke with a novel prognostic model: The SeLECT score. Lancet Neurol. 2018;17(2):143-152.
9. Haapaniemi E, Strbian D, Rossi C, et al. The CAVE score for predicting late seizures after intracerebral hemorrhage. Stroke. 2014;45(7):1971-1976.

## Author

Wonwoo Lee, M.D.  
Assistant Professor  
Department of Neurology, Yongin Severance Hospital, Yonsei University College of Medicine  
363, Dongbaekjukjeon-daero, Giheung-gu, Yongin-si, Gyeonggi-do, Republic of Korea

## 주의

임상 의사결정 보조 초안입니다. 실제 처방 전 기관 프로토콜, 약품 농도, 신장/간 기능, 임신 가능성, ECG/BP/airway/EEG monitoring 가능 여부를 확인하세요.
