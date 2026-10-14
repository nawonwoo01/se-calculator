#!/usr/bin/env bash
set -euo pipefail
SE_SIMULATOR_ID=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; groups=json.load(sys.stdin)["devices"]; phones=[d for group in groups.values() for d in group if d.get("isAvailable") and "iPhone" in d["name"]]; chosen=next((d for d in phones if "Pro Max" in d["name"]), phones[0]); print(chosen["udid"])')
xcrun simctl boot "$SE_SIMULATOR_ID" 2>/dev/null || true
xcrun simctl bootstatus "$SE_SIMULATOR_ID" -b
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination "id=$SE_SIMULATOR_ID" -derivedDataPath ios-build CODE_SIGNING_ALLOWED=NO build
xcrun simctl install "$SE_SIMULATOR_ID" ios-build/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch --terminate-running-process "$SE_SIMULATOR_ID" org.secalculator.app
sleep 5
mkdir -p artifacts
xcrun simctl io "$SE_SIMULATOR_ID" screenshot artifacts/ios-simulator-launch.png
xcrun simctl shutdown "$SE_SIMULATOR_ID"
