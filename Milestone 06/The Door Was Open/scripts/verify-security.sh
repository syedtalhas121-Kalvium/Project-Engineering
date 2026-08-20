#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
JWT_SECRET="${JWT_SECRET:-challenge-demo-secret}"

request_status() {
  local method="$1" path="$2" body="${3:-}"
  if [[ -n "$body" ]]; then
    curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$BASE_URL$path" \
      -H 'Content-Type: application/json' -d "$body"
  else
    curl -sS -o /dev/null -w '%{http_code}' -X "$method" "$BASE_URL$path"
  fi
}

assert_status() {
  local expected="$1" actual="$2" label="$3"
  if [[ "$actual" != "$expected" ]]; then
    printf 'FAIL: %s (expected %s, got %s)\n' "$label" "$expected" "$actual" >&2
    exit 1
  fi
  printf 'PASS: %s -> %s\n' "$label" "$actual"
}

assert_status 401 "$(request_status GET /api/users/profile)" 'GET /api/users/profile without token'
assert_status 401 "$(request_status PUT /api/users/profile '{"email":"verified@example.com"}')" 'PUT /api/users/profile without token'
assert_status 401 "$(request_status GET /api/posts/my-posts)" 'GET /api/posts/my-posts without token'
assert_status 401 "$(request_status POST /api/posts/create '{"title":"verified","content":"protected"}')" 'POST /api/posts/create without token'
assert_status 401 "$(request_status GET /api/admin/users)" 'GET /api/admin/users without token'
assert_status 401 "$(request_status DELETE /api/admin/users/42)" 'DELETE /api/admin/users/42 without token'
assert_status 200 "$(request_status GET /api/health)" 'GET /api/health without token'
assert_status 201 "$(request_status POST /api/auth/register '{"username":"verify-user","password":"secret","email":"verify@example.com"}')" 'POST /api/auth/register without token'

login_response="$(curl -sS -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"username":"verify-user","password":"secret"}')"
token="$(printf '%s' "$login_response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
if [[ -z "$token" ]]; then
  printf 'FAIL: login did not return a token\n' >&2
  exit 1
fi

assert_status 200 "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/users/profile" -H "Authorization: Bearer $token")" 'GET /api/users/profile with valid token'
assert_status 200 "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/posts/my-posts" -H "Authorization: Bearer $token")" 'GET /api/posts/my-posts with valid token'
assert_status 200 "$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/admin/users" -H "Authorization: Bearer $token")" 'GET /api/admin/users with valid token'

printf 'All authentication route checks passed.\n'
