const test = require('node:test');
const assert = require('node:assert/strict');
const { checkRelease } = require('../scripts/release-check.cjs');

const ready = {
  appId: 'org.secalculator.app', appIdConfirmed: true, publisher: 'Test Hospital',
  publisherEligibilityConfirmed: true, clinicalReviewApproved: true, medicalRegulatoryAssessmentCompleted: true,
  googlePlayAccountReady: true, googlePlayOrganizationAccountConfirmed: true, androidUploadSigningReady: true,
  appleDeveloperAccountReady: true, appleSigningReady: true, physicalDeviceTestsPassed: true,
  iosArchiveValidated: true, storeScreenshotsReady: true, currentStoreRequirementsReviewed: true,
  price: 'free', ads: false, inAppPurchases: false, supportEmail: 'support@secalculator.org',
  supportUrl: 'https://secalculator.org/support', privacyUrl: 'https://secalculator.org/privacy',
  clinicalReviewer: 'Test Reviewer', clinicalReviewDate: '2026-10-01'
};
const check = (changes, platform = 'all') => checkRelease({ ...ready, ...changes }, platform, '2026-10-14');

test('unsigned iOS archive and simulator checks do not satisfy distribution validation', () => {
  assert.deepEqual(check({}), []);
  assert.ok(check({ iosArchiveValidated: false, iosUnsignedDeviceArchiveBuilt: true, iosSimulatorBuildPassed: true }, 'ios').includes('iosArchiveValidated'));
});
test('Android medical release requires an organization account independently of iOS eligibility', () => {
  const changes = { googlePlayOrganizationAccountConfirmed: false, publisherEligibilityConfirmed: false };
  assert.deepEqual(check(changes, 'android'), ['googlePlayOrganizationAccountConfirmed']);
  assert.deepEqual(check(changes, 'ios'), ['publisherEligibilityConfirmed']);
});
test('platform checks exclude only the other platform requirements and keep clinical review', () => {
  assert.deepEqual(check({ appleDeveloperAccountReady: false, appleSigningReady: false, iosArchiveValidated: false }, 'android'), []);
  assert.deepEqual(check({ googlePlayAccountReady: false, androidUploadSigningReady: false }, 'ios'), []);
  for (const platform of ['android', 'ios']) assert.ok(check({ clinicalReviewApproved: false }, platform).includes('clinicalReviewApproved'));
  assert.throws(() => check({}, 'typo'));
});
test('placeholder contacts, invalid dates and paid settings cannot pass preflight', () => {
  for (const privacyUrl of [null, 'http://secalculator.org/privacy', 'https://localhost/privacy', 'https://example.com/privacy', 'https://staging.local/privacy', 'https://127.0.0.1/privacy', 'https://user:pass@secalculator.org/privacy']) {
    assert.ok(check({ privacyUrl }).includes('privacyUrl'), String(privacyUrl));
  }
  for (const clinicalReviewDate of ['2026-02-30', '2026-10-15', 'yesterday', null]) assert.ok(check({ clinicalReviewDate }).includes('clinicalReviewDate'));
  assert.ok(check({ publisher: ' ', clinicalReviewer: ' ', supportEmail: 'pending' }).length >= 3);
  assert.ok(check({ price: 'paid' }).length);
  assert.ok(check({ ads: true }).length);
  assert.ok(check({ inAppPurchases: true }).length);
});
