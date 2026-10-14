# 개발 빌드 검증 기록

검증일: 2026-10-14. 임상 검토·실기기 검증·스토어 심사는 미완료다.

## 확인된 결과

- Node 산술 테스트 5건 통과: 독립적인 알려진 용량/농도 예제, dose cap, 성인 체중식, 오류 입력, STESS 0–6 경계.
- Playwright 모바일 UI/오프라인 테스트 8건 통과: 기존 결과 제거, 약제별 농도, PE 단위, 케이스 문자열 처리/초기화, 네이티브 설정 고정/메모리 보관, 주 약제 전환, PWA 개인정보 페이지 오프라인 분리.
- `npm audit`: 전체 의존성 및 production 의존성 각각 취약점 보고 0건.
- Android `assembleDebug bundleRelease` 성공. APK debug 서명 검증 통과. AAB는 unsigned임을 확인했다.
- APK metadata: ID `org.secalculator.app`, versionCode 1, versionName 0.1.0, min SDK24/target SDK36.
- APK/AAB 내부 `app.js`, `calculator-core.js`, `release-config.js`가 최종 `www` 번들과 바이트 단위로 일치한다.
- iOS 프로젝트/plist/privacy manifest의 구문과 resource 등록 확인.
- macOS GitHub Actions에서 iOS Simulator 대상 `xcodebuild ... CODE_SIGNING_ALLOWED=NO build` 성공: [첫 CI의 iOS job](https://github.com/nawonwoo01/se-calculator/actions/runs/38504660240/job/115659280637).
- 같은 첫 CI의 web job(산술/UI/오프라인 검증) 통과. Android job은 setup action의 폐기된 SDK `tools` 패키지 기본값 때문에 초기 환경 설정에서 실패했다. SDK 패키지를 `platform-tools`로 지정하고 최신 명령행 도구를 고정해 재검증한다. 후속 결과는 PR의 Actions와 본 기록의 아래 후속 항목에서 확인한다.

## 로컬 개발 산출물

`artifacts/`는 Git에서 제외한다. 아래는 해당 로컬 빌드의 해시이며 CI 빌드의 debug key/시간 정보 때문에 CI 파일과 해시는 달라질 수 있다.

| 파일 | 크기 | SHA-256 |
|---|---:|---|
| se-calculator-0.1.0-debug.apk | 4,455,042 bytes | 56d0b4a13c2d935982c05f9a14507175d459f30cd9fbdd1a9178cb63c3dc51e3 |
| se-calculator-0.1.0-unsigned.aab | 3,129,414 bytes | 836f9b7ae73a792f3d713c3df996c5b9d2db4c480e323906d0695d5b3ad7adb0 |

APK는 개발 확인용이며 임상 투여/스토어 배포용이 아니다. AAB는 upload key 서명 전에는 Google Play에 업로드할 수 없다. iOS 배포 Archive/IPA는 아직 생성하지 않았다. Simulator compile 통과는 TestFlight 업로드나 iPhone/iPad 실행 검증을 의미하지 않는다.

## 제출 상태

Play Console/App Store Connect 앱 등록·업로드·심사 요청은 수행하지 않았다. 출시 계정·명의·서명·임상 검토·공개 정책 및 지원 연락처가 확인된 이후 진행한다. 스토어 최신 정책 본문을 이 환경에서 조회할 수 없어 현재 콘솔 요구사항은 별도 확인해야 한다. `release-state.json`의 제출 상태는 계속 false다.

## 진행 알림

“SE 앱 출시 진행 알림”이 GitHub PR/출시 기록을 매시간 확인한다. 의미 있는 변화나 새 사용자 조치가 있을 때만 알린다. 연결되지 않은 스토어의 심사 상태를 직접 감시하지 않는다.

## 후속 CI 검증

SDK 설정 수정 후 [두 번째 CI](https://github.com/nawonwoo01/se-calculator/actions/runs/38505192133)에서 web, Android APK/AAB, iOS Simulator compile이 모두 통과했다. 추가한 Simulator 실행/네이티브 화면 캡처 검증은 다음 CI에서 확인한다.

세 번째 CI에서 iOS 프로세스 실행은 성공했으나 5초 후 캡처가 흰 화면이었다. 이 결과를 UI 검증 통과로 판단하지 않는다. 고정 지연을 제거하고 DEBUG/명시적 CI 플래그에서 실제 페이지의 10 mL/hr·3600 mg 계산 결과 확인 신호를 받은 뒤 캡처하도록 보완한다.

네 번째 CI에서 Android/web은 통과했고 iOS compile도 성공했으나 readiness 신호 대기가 실패했다. 수집된 로그에는 프로세스 실행과 초기 WKWebView cookie 초기화만 있었고 Swift stdout 메시지가 없어, CI 콘솔을 PTY로 연결하고 readiness 메시지를 즉시 flush하도록 보완한다. iOS 화면 검증은 아직 미완료다.
