# 공개 스토어 정책 확인

확인일: 2026-10-14 (한국 시간). Apple·Google 공식 공개 페이지를 직접 읽었다. 로그인한 콘솔, 계정별 요구사항, 기관 출시 권한, 임상/규제 승인 또는 스토어 제출을 확인한 기록은 아니다. `currentStoreRequirementsReviewed`는 제출 직전의 콘솔 확인까지 마쳐야 true로 바꾼다.

## 출시 명의와 의료 앱

| 공식 요구사항 | SE Calculator 준비 항목 |
|---|---|
| [Google Play Console Requirements](https://support.google.com/googleplay/android-developer/answer/10788890?hl=en)는 Medical 등 의료 앱을 제공하는 개발자가 계정 생성 시 Organization으로 등록하도록 요구한다. | 용량 계산과 위험 점수를 제공하는 현 intended use에서는 조직 계정으로 진행한다. 개인 계정의 일반 테스트 요건을 충족하는 것만으로 이 조건을 대신하지 않는다. `googlePlayOrganizationAccountConfirmed`는 아직 false다. |
| [Google 계정 유형 안내](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)는 조직의 D-U-N-S 및 신원 확인을 안내한다. | 기관의 계정 관리자가 법적 명칭·주소·D-U-N-S·출시 권한을 직접 확인한다. 개발자의 소속 표기나 Git 작성자 정보로 대체하지 않는다. 정부기관 등 예외 여부는 공식 등록 흐름에서 확인한다. |
| [Apple App Review Guidelines 1.4.2](https://developer.apple.com/app-store/review/guidelines/#physical-harm)는 약물 용량 계산기의 출처를 제약사·병원·대학·보험사·약국 등 승인된 주체로 제한하거나 FDA/해당 국가 규제기관의 승인을 요구한다. | 적격 주체의 출시 권한과 장기 지원 책임 또는 적용 가능한 승인 근거를 확보한다. 개인 의사라는 사실만으로 적격성 충족을 기록하지 않는다. 무료 여부·면책 문구·코드 테스트는 이를 대신하지 않는다. |

## Google 의료 신고와 정책 URL

- [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en)의 Medical → Clinical Decision Support에는 drug dosage calculator와 risk assessment tool이 명시되어 있다. 현재 기능에 해당하는 신고 초안이며, 규제 대상이면 Medical Device Apps 항목 및 증빙도 필요하다. 등록 여부는 임상·규제 검토 후 확정한다.
- [Health Content and Services](https://support.google.com/googleplay/android-developer/answer/16679511?hl=en)는 공개되어 있고 지역 제한이 없는 비 PDF 개인정보 정책과 앱 내 안내를 요구한다. 규제 대상 의료기기에는 승인 등 증빙을, 그 외 의료 앱에는 비의료기기 및 진단·치료 대체 불가 설명을 요구한다. 아직 규제 분류를 확정하지 않았으므로 앱에 비의료기기라는 주장을 추가하지 않는다.
- 지원/정책 URL, Data Safety와 App Privacy 응답은 최종 SDK·바이너리의 실제 동작과 함께 검토한다. 현재 공개 지원 연락처와 URL은 미확정이고, 번들의 정책/지원 페이지는 초안이다.

## 빌드·테스트 요구사항

| 공식 공개 기준 | 프로젝트 상태와 남은 확인 |
|---|---|
| [Google target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en): 2026-08-31부터 새 일반 Android 앱/업데이트는 API36 이상. | 현재 target/compile SDK36. 제출 때 콘솔에서 적용되는 기준을 재확인한다. |
| [Apple SDK 요구사항](https://developer.apple.com/news/upcoming-requirements/): 2026-04-28부터 Xcode26+/iOS26+ SDK, 2026-09-09부터 최소 지원 iOS13+. | 프로젝트 최소 지원 iOS15. 기기용 Release Archive CI는 Xcode/SDK26 이상을 검사한다. unsigned Archive는 Validate App·IPA·TestFlight 업로드와 별개다. |
| [Google 새 개인 계정 테스트](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en): 해당 개인 계정의 production access 신청에는 12명 이상이 연속 14일 참여한 closed test가 필요하다. | 이 조건을 조직 계정에도 그대로 적용한다고 단정하지 않는다. 의료 앱 조직 계정의 실제 테스트 트랙·권한 조건은 연결된 콘솔에서 확인한다. 실제 기기 검증은 별도로 수행한다. |

기관 담당자의 확인이 필요한 곳: [Google Play Console](https://play.google.com/console/), [Apple Developer 등록](https://developer.apple.com/programs/enroll/), [App Store Connect](https://appstoreconnect.apple.com/). 본인/기관 인증, 약관·결제 및 기관 출시 승인은 소유자 권한이 필요하다. 비밀번호·복구 코드·개인 서명 키를 채팅으로 전달하지 않는다.
