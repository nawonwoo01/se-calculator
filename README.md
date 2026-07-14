# SE ASM/Sedative Calculator

정적 HTML/PWA 계산기 초안입니다.

## 로컬 실행

- Windows/Mac: `index.html`을 더블클릭하면 기본 계산기는 실행됩니다.
- PWA 설치/오프라인 캐시까지 확인하려면 폴더에서 간단한 서버로 실행하세요.

```bash
python -m http.server 8787
```

브라우저에서 `http://127.0.0.1:8787/index.html` 접속.

## 웹 게시

`se-calculator` 폴더 전체를 정적 호스팅에 업로드하면 됩니다.

- GitHub Pages
- Netlify
- Vercel static
- 병원/개인 웹서버 정적 디렉터리

웹으로 열면 Android Chrome, iOS Safari에서 “홈 화면에 추가”로 설치형 웹앱처럼 사용할 수 있습니다.

## 포함 기능

- 환자 체중/키/성별 기반 actual/IBW/LBW/AdjBW 계산
- Midazolam, ketamine, propofol, pentobarbital, thiopental infusion 계산
- Propofol mcg/kg/min to mg/kg/hr 환산
- LEV/fPHT/PHT/VPA/PB/LAC loading dose와 maximum cap
- 환자별 contraindication/warning flag
- SeLECT, CAVE, STESS quick score
- Android/iOS 홈 화면 추가 안내
- Admin 탭: 약제 파라미터, 근거 문구를 JSON으로 로컬 수정/내보내기/가져오기

## Admin 탭 안내

GitHub Pages 버전은 정적 웹앱이므로 Admin 탭에서 저장한 값은 현재 브라우저의 `localStorage`에 저장됩니다.
모든 사용자에게 기본값으로 배포하려면 export한 JSON을 바탕으로 `index.html`의 기본 설정을 업데이트해야 합니다.

## Author

Wonwoo Lee, M.D.  
Assistant Professor  
Department of Neurology, Yongin Severance Hospital, Yonsei University College of Medicine  
363, Dongbaekjukjeon-daero, Giheung-gu, Yongin-si, Gyeonggi-do, Republic of Korea

## 주의

임상 의사결정 보조 초안입니다. 실제 처방 전 기관 프로토콜, 약품 농도, 신장/간 기능, 임신 가능성, ECG/BP/airway/EEG monitoring 가능 여부를 확인하세요.
