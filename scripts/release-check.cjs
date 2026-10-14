const state = require('../docs/release/release-state.json');
const failures = [];
for (const key of ['appIdConfirmed', 'publisherEligibilityConfirmed', 'clinicalReviewApproved', 'medicalRegulatoryAssessmentCompleted', 'googlePlayAccountReady', 'appleDeveloperAccountReady', 'androidUploadSigningReady', 'appleSigningReady', 'physicalDeviceTestsPassed', 'iosArchiveValidated', 'storeScreenshotsReady', 'currentStoreRequirementsReviewed']) if (state[key] !== true) failures.push(key);
for (const key of ['publisher', 'supportEmail', 'supportUrl', 'privacyUrl', 'clinicalReviewer', 'clinicalReviewDate']) if (!state[key]) failures.push(key);
if (failures.length) {
  console.error('스토어 제출 전 확인 필요:\n' + failures.map(f => `- ${f}`).join('\n'));
  process.exitCode = 1;
} else console.log('기록된 제출 선행 조건 충족. 현재 콘솔 요구사항과 서명된 실제 빌드를 다시 확인하세요.');
