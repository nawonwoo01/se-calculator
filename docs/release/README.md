# SE Calculator 무료 앱 출시 준비

기준일: 2026-10-14 (한국 시간). 현재 상태는 **개발용 앱 구성 / 스토어 미제출**이다. `release-state.json`은 확인된 사실만 기록한다. 현재 명의·지원 연락처·계정·서명·임상 검토를 확인 중이다.

## 구성 및 재현

- Capacitor 8.5.3으로 정적 계산기를 앱 내부에 포함한다. 원격 웹사이트를 불러오지 않아 최초 실행부터 계산에 인터넷이 필요 없다.
- Android: Android 7.0/API 24 이상, target/compile SDK 36, Java 21.
- iOS: iOS 15 이상 프로젝트. 실제 Archive와 서명 검증은 macOS/Xcode에서 수행해야 한다.
- 앱 ID `org.secalculator.app`은 임시값이다. 제출 전 출시 조직의 식별자와 스토어 중복 여부를 확인하고 네이티브 프로젝트까지 일치시킨다.
- 무료, 광고 없음, 결제 없음, 로그인 없음. Android/iOS는 케이스를 메모리에만 보관한다. 웹의 기존 저장 기능은 별도로 유지한다.

```bash
npm ci
npm test
npm run mobile:sync
npm run test:ui
cd android
./gradlew assembleDebug bundleRelease
```

`assembleDebug`의 APK는 개발 검증용이다. 서명이 준비되지 않은 `bundleRelease` AAB는 업로드할 수 없다. 앱 아이콘과 splash의 원본은 `assets/`이며 네이티브 리소스를 포함한다. `npm run build`는 번들·PWA 아이콘 원본을 재생성한다. Android Studio/Xcode에서 리소스를 확인한다.

## 사용자의 개입이 필요한 순서

1. **출시 명의와 계정**: Google Play Console·Apple Developer 가입 여부, 개인/기관 명의, 공개 지원 이메일을 확정한다. 무료 앱에도 개발자 등록 비용이 들 수 있다. 결제·본인 확인·약관 동의는 계정 소유자가 직접 처리한다. 채팅에 비밀번호나 복구 코드를 보내지 않는다.
2. **의료 앱 심사 적격성**: Apple App Review Guidelines 1.4.2의 drug dosage calculator 조건을 확인한다. 병원·대학·제약사 등의 출처 또는 규제 승인 요건이 적용될 수 있으므로 저자의 소속 표기만으로 기관의 출시 승인을 대신하지 않는다. 기관 명의 출시 권한/승인 또는 적용 가능한 규제 근거를 확보한다. Google Health apps declaration 및 국내 의료기기 소프트웨어 해당 여부도 intended use 기준으로 검토한다. “교육용” 문구만으로 규제 적용이 사라지는 것으로 판단하지 않는다.
3. **임상 검토**: `clinical-review.md`를 의료전문가가 실제 계산표·원문·기관 프로토콜과 비교하여 확인한다. 코드 테스트 통과는 임상 승인과 별개다.
4. **공개 정책·지원 페이지**: 운영자·지원 이메일·문의 처리방침을 보완하고 공개 HTTPS URL을 검증한다. 현재 `privacy.html`과 `support.html`은 초안이며 공개 정책 URL이 아직 확정되지 않았다.
5. **Android 서명과 테스트**: 영구 upload key를 안전하게 생성/보관하고 Play App Signing을 설정한다. 서비스 계정은 앱 범위에 맞는 최소 권한으로 연결한다. 새 개인 계정에는 closed test 등 production access 요구가 적용될 수 있으므로 현재 콘솔의 테스터 수·기간을 따른다. 내부 테스트 → 실제 기기 확인 → 필요한 closed test → production access → 무료 배포 순서로 진행한다.
6. **iOS 서명과 테스트**: Apple Team ID·Bundle ID·App Store Connect 앱 레코드·배포 인증서/프로파일을 준비한다. macOS에서 Xcode Archive → Validate → TestFlight 업로드 → iPhone/iPad 확인 → 심사 제출 순서로 진행한다. 제출 시점의 Xcode/SDK 요구사항을 확인한다.
7. **스토어 양식 확정**: 의료 앱 신고, Data Safety/App Privacy, content/age rating, 수출 준수, 지원 연락처, 무료 가격, 출시 국가, 실기기/시뮬레이터 스크린샷을 확정한다. `store-listing.json`은 초안이다. 데이터 미수집 표시는 실제 최종 바이너리·SDK 감사 결과와 일치해야 한다.

## 제출 자료

- `store-listing.json`: 한국어·영어 설명 초안.
- `review-notes.md`: 심사 담당자의 계산 확인 절차와 출처 안내.
- `clinical-review.md`: 원문 대조 항목과 확인할 임상 범위.
- `release-state.json`: 계정·서명·검토·제출 상태.
- `npm run release:check`: 미확인 제출 선행 조건을 표시하며 현재 실패가 정상이다.

## 정책 확인 링크

- Apple 의료 앱 정책: https://developer.apple.com/app-store/review/guidelines/#physical-harm
- Apple Developer 등록: https://developer.apple.com/programs/enroll/
- App Store Connect: https://appstoreconnect.apple.com/
- Google Play Console: https://play.google.com/console/
- Google 등록 안내: https://support.google.com/googleplay/android-developer/answer/6112435
- Google Health apps: https://support.google.com/googleplay/android-developer/answer/14738291
- Google 새 개인 계정 테스트: https://support.google.com/googleplay/android-developer/answer/14151465

위 링크는 제출 시 확인해야 할 공식 목적지다. 이 실행 환경의 네트워크는 패키지·GitHub 도메인으로 제한되어 있어 해당 정책 본문의 최신 개정·계정별 요구사항을 실시간 검증하지 못했다. 따라서 등록 비용/테스터 수/SDK 마감일을 현재 확인된 수치로 단정하지 않는다. 스토어 API나 로그인된 콘솔 세션도 현재 연결되지 않아 앱 등록·심사 제출이 이루어지지 않았다.
