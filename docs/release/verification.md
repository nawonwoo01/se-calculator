# 개발 빌드 검증 기록

검증일: 2026-10-14. 검증 코드 commit: `ee3ae20f6195e32f582918cdf590752850021b26`.
[최종 코드 CI](https://github.com/nawonwoo01/se-calculator/actions/runs/38542858607)에서 web, Android, iOS Simulator, iOS 기기용 unsigned Release Archive 네 작업이 모두 통과했다. 임상 검토·실기기 테스트·스토어 심사는 미완료다.

## 추가 출시 준비 검증

2026-10-14 추가 작업: 공식 공개 정책 조회를 `policy-review.md`에 기록했고, 의료 앱 조직 계정·연락처/URL·무료 설정·임상 검토 날짜와 플랫폼별 제출 조건을 점검하도록 보완했다. 로컬 및 최종 CI에서 Node 테스트는 산술 5건과 출시 조건 4건, 총 9건이 통과했다. 모바일 UI/오프라인 8건을 합쳐 자동 테스트 17건이 통과했다. 실제 기록의 `release:check`는 미확인 선행 조건 때문에 계속 실패하며 이는 CI 코드 실패와 별개다.

기기용 unsigned iOS Release Archive는 Xcode26.6/iOS26.5 SDK에서 생성됐다. CI는 arm64 실행 파일, Bundle ID/버전, 11개 오프라인 파일의 번들 일치, DEBUG smoke 검증 문자열 제외, 앱 privacy manifest 존재/구문과 포함된 manifest 목록을 점검했다. 이 목록 확인은 required-reason API 전체 감사가 아니다. `iosUnsignedDeviceArchiveBuilt`는 true이며, `iosArchiveValidated`는 서명된 배포 Archive의 Xcode Validate App을 확인할 때까지 false를 유지한다.

[CI Archive 아티팩트](https://github.com/nawonwoo01/se-calculator/actions/runs/38542858607/artifacts/11882409645): `ios-unsigned-device-release-archive-not-for-store-upload.zip`, 3,216,403 bytes, SHA-256 `5fd2f69d104a07022c1a9546d75ab8b06f35b76080fb8bbd3cffdaf34ff07cfb`. ZIP 안에는 `ios-unsigned-release-not-for-upload.tar.gz`와 `ios-release-archive-verification.json`이 있다. 성공한 생성/검사/업로드 로그와 GitHub 아티팩트 metadata를 근거로 확인했다. 이 작업 환경에서 직접 다운로드한 Archive를 추가 검사하지는 못했다. 서명·IPA export·Validate App·스토어 업로드는 수행하지 않았다.

## 확인된 결과

- Node 산술 테스트 5건 통과: 알려진 용량/농도 예제, dose cap, 성인 체중식, 오류 입력, STESS 0–6 경계.
- Playwright 모바일 UI/오프라인 테스트 8건 통과: 기존 결과 제거, 약제별 농도, PE 단위, 케이스 문자열 처리/초기화, 네이티브 설정 고정/메모리 보관, 주 약제 전환, PWA 개인정보 페이지 오프라인 분리.
- `npm audit`: 전체 및 production 의존성 각각 취약점 보고 0건.
- Android `assembleDebug bundleRelease` 성공. APK debug 서명 검증 통과. AAB는 unsigned임을 확인했다.
- APK metadata: ID `org.secalculator.app`, versionCode 1, versionName 0.1.0, min SDK24/target SDK36.
- 로컬 APK/AAB 내부 `app.js`, `calculator-core.js`, `release-config.js`가 최종 `www` 번들과 바이트 단위로 일치한다.
- iOS 프로젝트/plist/privacy manifest의 구문과 resource 등록 확인.
- macOS/Xcode CI에서 iOS Simulator compile·install·launch 성공.
- 실제 iOS WKWebView에서 체중60 kg/키170 cm 입력 후 Midazolam `10 mL/hr`, LEV `3600 mg` 계산값 확인. `SE_UI_READY` 신호를 받은 뒤 화면을 캡처했다.
- 앞선 [Simulator 검증 CI](https://github.com/nawonwoo01/se-calculator/actions/runs/38509745589)의 실제 캡처를 다운로드하여 앱 화면 표시를 직접 검증했다. `previews/phone-ios-simulator-development.png`는 그 개발용 네이티브 캡처다. 다른 `browser-preview` 파일은 로컬 브라우저 미리보기다. 최신 CI도 준비 신호/계산값 확인 후 개발 캡처를 생성했으나 새 캡처를 직접 열어 확인한 것은 아니다. 계산기 UI와 입력 검증 코드는 이번 추가 작업에서 변경하지 않았다.

첫 실행의 고정 5초 지연만으로는 흰 화면을 캡처할 수 있어 CI는 실제 페이지와 계산값 준비를 확인한다. 예제 입력/로그는 `DEBUG` 빌드의 명시적 `--se-ui-smoke` 실행에서만 동작한다. 정상 사용 및 Release 빌드에는 예제 입력을 실행하지 않는다. CI 콘솔은 PTY와 stdout flush로 준비 신호를 즉시 수집한다.

## 로컬 개발 산출물

`artifacts/`는 Git에서 제외한다. 아래 해시는 해당 로컬 빌드의 값이며, CI 빌드는 debug key/시간 정보로 해시가 달라질 수 있다.

| 파일 | 크기 | SHA-256 |
|---|---:|---|
| se-calculator-0.1.0-debug.apk | 4,455,042 bytes | 56d0b4a13c2d935982c05f9a14507175d459f30cd9fbdd1a9178cb63c3dc51e3 |
| se-calculator-0.1.0-unsigned.aab | 3,129,414 bytes | 836f9b7ae73a792f3d713c3df996c5b9d2db4c480e323906d0695d5b3ad7adb0 |

APK는 개발 확인용이며 임상 투여/스토어 배포용이 아니다. AAB는 upload key 서명 전에는 Google Play에 업로드할 수 없다. 서명된 iOS 배포 Archive/IPA는 아직 생성하지 않았다. Simulator 실행 성공은 TestFlight 업로드나 실제 iPhone/iPad 테스트를 의미하지 않는다. 개발용 캡처는 출시 명의·임상 검토·최종 문구 확정 후 스토어용으로 다시 준비한다.

## 제출 및 알림 상태

Play Console/App Store Connect 앱 등록·업로드·심사 요청은 수행하지 않았다. 출시 계정·명의·서명·임상 검토·공개 정책 및 지원 연락처가 확인된 이후 진행한다. 현재 콘솔 요구사항도 별도 확인해야 한다. `release-state.json`의 제출 상태는 계속 false다.

“SE 앱 출시 진행 알림”은 GitHub PR/출시 기록을 매시간 확인해 의미 있는 변화나 새 사용자 조치가 있을 때만 알린다. 연결되지 않은 스토어 심사 상태를 직접 감시하지 않는다. 문서 갱신에도 PR 전체 diff의 path 조건으로 자동 CI가 추가 실행될 수 있다. `verifiedCodeCommit`과 위 CI 링크가 검증된 코드의 근거이며, 최신 문서 commit의 CI 결과와 구분한다. 문구 정정만 포함한 commit은 명시적으로 CI를 생략한다.
