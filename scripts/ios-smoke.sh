#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts
SE_SIMULATOR_ID=$(xcrun simctl list devices available -j | python3 -c 'import json,sys; groups=json.load(sys.stdin)["devices"]; phones=[d for group in groups.values() for d in group if d.get("isAvailable") and "iPhone" in d["name"]]; chosen=next((d for d in phones if "Pro Max" in d["name"]), phones[0]); print(chosen["udid"])')
xcrun simctl boot "$SE_SIMULATOR_ID" 2>/dev/null || true
xcrun simctl bootstatus "$SE_SIMULATOR_ID" -b
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination "id=$SE_SIMULATOR_ID" -derivedDataPath ios-build CODE_SIGNING_ALLOWED=NO build
xcrun simctl install "$SE_SIMULATOR_ID" ios-build/Build/Products/Debug-iphonesimulator/App.app
trap 'xcrun simctl shutdown "$SE_SIMULATOR_ID" 2>/dev/null || true' EXIT
xcrun simctl launch --terminate-running-process --console-pty "$SE_SIMULATOR_ID" org.secalculator.app --se-ui-smoke > artifacts/ios-console.log 2>&1 &
SE_SIM_LAUNCH_PID=$!
node scripts/wait-ios-ready.cjs
xcrun simctl io "$SE_SIMULATOR_ID" screenshot artifacts/ios-simulator-launch.png
kill "$SE_SIM_LAUNCH_PID" 2>/dev/null || true
