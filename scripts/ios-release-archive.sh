#!/usr/bin/env bash
set -euo pipefail
# Compilation and bundle inspection only. No credentials, export, upload or signing.
mkdir -p artifacts
SE_XCODE_VERSION=$(xcodebuild -version | head -n 1 | awk '{print $2}')
SE_IOS_SDK_VERSION=$(xcrun --sdk iphoneos --show-sdk-version)
if [ "${SE_XCODE_VERSION%%.*}" -lt 26 ] || [ "${SE_IOS_SDK_VERSION%%.*}" -lt 26 ]; then
  echo 'Release compilation requires Xcode 26+ and iOS SDK 26+.' >&2
  exit 1
fi
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -derivedDataPath ios-release-build \
  -archivePath artifacts/ios-unsigned-release.xcarchive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' archive
python3 scripts/verify-ios-archive.py artifacts/ios-unsigned-release.xcarchive
tar -czf artifacts/ios-unsigned-release-not-for-upload.tar.gz -C artifacts ios-unsigned-release.xcarchive
