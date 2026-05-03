#!/usr/bin/env bash
# pull.sh — pull latest from origin, auto-stashing any local changes.
# If a conflict occurs while restoring stashed changes, the stash is preserved
# (see `git stash list`) so nothing is lost.
# Usage: ./pull.sh
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

git pull --rebase --autostash
