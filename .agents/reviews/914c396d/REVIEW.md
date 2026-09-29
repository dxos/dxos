---
branch: claude/youthful-brown-u9ky00
commit: 914c396d8bf54b43187956c36fc6b266aeba18f6
base: f3c02b30ea43d85615186056e033adb200e25259
mode: fast
createdAt: 2026-09-29T14:00:37.669Z
isFinalized: true
groups: 52
rules: [no-casts, structured-logging-not-console]
reviewId: 914c396d
---

_1 error(s), 1 warning(s)._

# ERROR 914c396d-1 no-casts `packages/apps/composer-app/src/functions/_worker.test.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-34 (`const archive = {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 914c396d-2 structured-logging-not-console `packages/apps/composer-app/src/functions/_worker.ts:157`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 157-168 (`}),`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.
