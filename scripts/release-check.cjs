function checkRelease(state, platform = 'all', today = new Date().toISOString().slice(0, 10)) {
  if (!['all', 'android', 'ios'].includes(platform)) throw new Error('platform must be all, android or ios');
  const failures = [];
  const required = ['appIdConfirmed', 'clinicalReviewApproved', 'medicalRegulatoryAssessmentCompleted',
    'physicalDeviceTestsPassed', 'storeScreenshotsReady', 'currentStoreRequirementsReviewed'];
  if (platform !== 'ios') required.push('googlePlayAccountReady', 'googlePlayOrganizationAccountConfirmed', 'androidUploadSigningReady');
  if (platform !== 'android') required.push('publisherEligibilityConfirmed', 'appleDeveloperAccountReady', 'appleSigningReady', 'iosArchiveValidated');
  for (const key of required) if (state[key] !== true) failures.push(key);
  for (const key of ['publisher', 'clinicalReviewer']) {
    if (typeof state[key] !== 'string' || !state[key].trim()) failures.push(key);
  }
  if (state.price !== 'free' || state.ads !== false || state.inAppPurchases !== false) failures.push('무료·광고 없음·인앱결제 없음 설정');
  if (!/^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*){2,}$/.test(state.appId || '')) failures.push('appId');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.supportEmail || '')) failures.push('supportEmail');
  for (const key of ['supportUrl', 'privacyUrl']) {
    try {
      const url = new URL(state[key]);
      const hostname = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.username || url.password || !hostname.includes('.') ||
          /(^|\.)(localhost|local|test|invalid|example)$/.test(hostname) ||
          /(^|\.)example\.(com|org|net)$/.test(hostname) ||
          /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) throw new Error('not a public HTTPS hostname');
    } catch { failures.push(key); }
  }
  const date = state.clinicalReviewDate;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > today) failures.push('clinicalReviewDate');
  return failures;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--platform' || !['android', 'ios', 'all'].includes(args[1]))) {
    console.error('사용법: npm run release:check -- [--platform android|ios|all]');
    process.exitCode = 2;
  } else {
    const platform = args[1] || 'all';
    const failures = checkRelease(require('../docs/release/release-state.json'), platform);
    if (failures.length) {
      console.error(`스토어 제출 전 확인 필요 (${platform}):\n` + failures.map(f => `- ${f}`).join('\n'));
      process.exitCode = 1;
    } else console.log('기록 형식과 제출 선행 조건 충족. 공개 URL의 실제 내용·콘솔 요구사항·서명된 최종 빌드는 별도 검증해야 합니다.');
  }
}
module.exports = { checkRelease };
