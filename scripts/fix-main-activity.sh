#!/usr/bin/env bash
set -euo pipefail

main_activity="exact-app/android/app/src/main/java/com/exact/mediaplayer/MainActivity.java"

if [[ ! -f "$main_activity" ]]; then
  echo "Missing $main_activity" >&2
  exit 1
fi

sed -i 's/protected void onDestroy()/public void onDestroy()/g' "$main_activity"

grep -n -A5 -B1 'void onDestroy' "$main_activity"
