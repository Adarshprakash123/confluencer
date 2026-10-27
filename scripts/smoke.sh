#!/usr/bin/env bash
# Smoke test against a running API (default http://localhost:3000)
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

json_field() {
  python3 -c "import sys,json; print(json.load(sys.stdin)$1)"
}

echo "== health =="
curl -sf "$BASE_URL/health" | python3 -m json.tool

echo "== create accounts =="
ALICE=$(curl -sf -X POST "$BASE_URL/accounts" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Alice"}')
BOB=$(curl -sf -X POST "$BASE_URL/accounts" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Bob"}')
A=$(echo "$ALICE" | json_field "['id']")
B=$(echo "$BOB" | json_field "['id']")
echo "Alice=$A"
echo "Bob=$B"

echo "== credit 100 + 50, debit 30 + 20 (expect balance 100) =="
curl -sf -X POST "$BASE_URL/accounts/$A/transactions" \
  -H 'Content-Type: application/json' \
  -d '{"type":"credit","amount":100,"reference_id":"smoke-c1"}' >/dev/null
curl -sf -X POST "$BASE_URL/accounts/$A/transactions" \
  -H 'Content-Type: application/json' \
  -d '{"type":"credit","amount":50,"reference_id":"smoke-c2"}' >/dev/null
curl -sf -X POST "$BASE_URL/accounts/$A/transactions" \
  -H 'Content-Type: application/json' \
  -d '{"type":"debit","amount":30,"reference_id":"smoke-d1"}' >/dev/null
BAL=$(curl -sf -X POST "$BASE_URL/accounts/$A/transactions" \
  -H 'Content-Type: application/json' \
  -d '{"type":"debit","amount":20,"reference_id":"smoke-d2"}' | json_field "['balance']")
echo "balance=$BAL"
test "$BAL" = "100"

echo "== insufficient balance (expect 422) =="
CODE=$(curl -s -o /tmp/smoke_err.json -w "%{http_code}" -X POST "$BASE_URL/accounts/$A/transactions" \
  -H 'Content-Type: application/json' \
  -d '{"type":"debit","amount":999,"reference_id":"smoke-bad"}')
test "$CODE" = "422"
echo "ok 422"

echo "== duplicate reference_id (expect 409) =="
CODE=$(curl -s -o /tmp/smoke_err.json -w "%{http_code}" -X POST "$BASE_URL/accounts/$A/transactions" \
  -H 'Content-Type: application/json' \
  -d '{"type":"credit","amount":1,"reference_id":"smoke-c1"}')
test "$CODE" = "409"
echo "ok 409"

echo "== pagination =="
curl -sf "$BASE_URL/accounts/$A/transactions?page=1&limit=2" | python3 -m json.tool >/dev/null
echo "ok"

echo "== transfer 30 Alice -> Bob (expect 70 / 30) =="
XFER=$(curl -sf -X POST "$BASE_URL/transfers" \
  -H 'Content-Type: application/json' \
  -d "{\"from_account_id\":\"$A\",\"to_account_id\":\"$B\",\"amount\":30,\"reference_id\":\"smoke-t1\"}")
FROM_BAL=$(echo "$XFER" | json_field "['from_account']['balance']")
TO_BAL=$(echo "$XFER" | json_field "['to_account']['balance']")
echo "Alice=$FROM_BAL Bob=$TO_BAL"
test "$FROM_BAL" = "70"
test "$TO_BAL" = "30"

echo ""
echo "Smoke checks passed."
