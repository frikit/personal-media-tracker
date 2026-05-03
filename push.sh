#!/usr/bin/env bash
# push.sh — stage tracked changes, commit without GPG signing, push.
# Usage: ./push.sh "commit message"
set -euo pipefail

MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  echo "usage: $0 \"commit message\"" >&2
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

git add .

if git diff --cached --quiet; then
  echo "nothing to commit."
  exit 0
fi

git -c commit.gpgsign=false commit -m "$MSG"
git push
