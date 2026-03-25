#!/usr/bin/env bash
set -euo pipefail

# E2E Smoke Test Runner
#
# Usage:
#   ./packages/e2e/scripts/run-smoke.sh          # API tests only (vitest)
#   ./packages/e2e/scripts/run-smoke.sh --ui      # API + UI tests (playwright)
#
# Environment:
#   API_URL  – API base URL  (default: http://localhost:3001)
#   WEB_URL  – Web dashboard (default: http://localhost:3000)
#
# Requires services running: docker compose up -d

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
E2E_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

API_URL="${API_URL:-http://localhost:3001}"
WEB_URL="${WEB_URL:-http://localhost:3000}"

run_ui=false
if [[ "${1:-}" == "--ui" ]]; then
  run_ui=true
fi

echo "==> Waiting for API at $API_URL/health ..."
attempts=0
max_attempts=30
until curl -sf "$API_URL/health" > /dev/null 2>&1; do
  attempts=$((attempts + 1))
  if [ "$attempts" -ge "$max_attempts" ]; then
    echo "ERROR: API not reachable after ${max_attempts}s"
    exit 1
  fi
  sleep 1
done
echo "==> API is healthy"

if $run_ui; then
  echo "==> Waiting for Web at $WEB_URL ..."
  attempts=0
  until curl -sf "$WEB_URL" > /dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [ "$attempts" -ge "$max_attempts" ]; then
      echo "ERROR: Web not reachable after ${max_attempts}s"
      exit 1
    fi
    sleep 1
  done
  echo "==> Web is healthy"
fi

echo "==> Running API smoke tests (vitest) ..."
cd "$E2E_DIR"
API_URL="$API_URL" npx vitest run

if $run_ui; then
  echo "==> Running UI smoke tests (playwright) ..."
  API_URL="$API_URL" WEB_URL="$WEB_URL" npx playwright test
fi

echo "==> All smoke tests passed!"
