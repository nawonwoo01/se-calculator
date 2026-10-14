"""Inspect the actual unsigned Release archive; do not imply store validation."""
import hashlib
import json
import os
from pathlib import Path
import plistlib
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
archive = Path(sys.argv[1]).resolve()
apps = list((archive / 'Products/Applications').glob('*.app'))
assert len(apps) == 1, 'Expected one archived application'
app = apps[0]
with (app / 'Info.plist').open('rb') as stream:
    info = plistlib.load(stream)
package = json.loads((root / 'package.json').read_text())
config = json.loads((root / 'capacitor.config.json').read_text())
assert info['CFBundleIdentifier'] == config['appId'], 'Bundle ID mismatch'
assert info['CFBundleShortVersionString'] == package['version'], 'Version mismatch'
assert info['DTPlatformName'] == 'iphoneos', 'Expected device archive, not simulator'
assert int(info['DTSDKName'].removeprefix('iphoneos').split('.')[0]) >= 26, 'iOS SDK too old'
binary = app / info['CFBundleExecutable']
architectures = subprocess.check_output(['xcrun', 'lipo', '-archs', str(binary)], text=True).strip().split()
assert 'arm64' in architectures and 'x86_64' not in architectures, 'Expected arm64 device executable'
binary_content = binary.read_bytes()
for marker in [b'--se-ui-smoke', b'SE_UI_PROBE_STARTED', b'SE_UI_READY', b'SE_UI_FAILURE']:
    assert marker not in binary_content, f'DEBUG smoke probe found in Release: {marker!r}'
assert not (app / 'embedded.mobileprovision').exists(), 'Unexpected provisioning profile in unsigned build'
files = {}
for source in sorted((root / 'www').rglob('*')):
    if source.is_file():
        relative = source.relative_to(root / 'www')
        bundled = app / 'public' / relative
        assert bundled.is_file() and source.read_bytes() == bundled.read_bytes(), f'Offline bundle mismatch: {relative}'
        files[str(relative)] = hashlib.sha256(bundled.read_bytes()).hexdigest()
manifests = list(app.rglob('PrivacyInfo.xcprivacy'))
assert app / 'PrivacyInfo.xcprivacy' in manifests, 'Missing application privacy manifest'
for manifest in manifests:
    with manifest.open('rb') as stream:
        plistlib.load(stream)
report = {
    'commit': os.environ.get('GITHUB_SHA'),
    'kind': 'unsigned-ios-device-release-archive',
    'storeUploadReady': False,
    'clinicalApproval': False,
    'bundleId': info['CFBundleIdentifier'],
    'version': info['CFBundleShortVersionString'],
    'sdk': info['DTSDKName'],
    'xcodeBuild': info.get('DTXcodeBuild'),
    'architectures': architectures,
    'debugProbeAbsent': True,
    'offlineBundleSha256': files,
    'privacyManifestPaths': [str(p.relative_to(app)) for p in sorted(manifests)],
    'limitations': ['No distribution signature or provisioning profile', 'No export, Validate App or TestFlight upload',
                    'No physical-device or clinical validation', 'Privacy inventory is not a required-reason API audit']
}
target = root / 'artifacts/ios-release-archive-verification.json'
target.write_text(json.dumps(report, indent=2) + '\n')
print(f'Unsigned arm64 Release archive verified: {len(files)} offline files, DEBUG probe absent. Report: {target}')
