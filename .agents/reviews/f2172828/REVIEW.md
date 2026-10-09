---
branch: dm/elegant-wozniak-w6k0mo
commit: f2172828518403029e2dfe9ab22e347130f83243
base: 362fd0f7bcf94a49bd1fca8b53a478f6f3e21383
mode: fast
createdAt: 2026-10-02T09:36:46.537Z
isFinalized: true
groups: 57
rules: [name-for-general-behavior, no-casts, no-sleep-in-test]
reviewId: f2172828
---

_2 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f2172828-1 - resolved - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:76
- f2172828-2 - ignored - name-for-general-behavior - packages/core/echo/echo-host/src/db-host/feed-data-source.ts:34
- f2172828-3 - ignored - no-casts - packages/core/echo/feed/src/feed-store.test.ts:354
- f2172828-4 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:540

## Issues

# WARN f2172828-1 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:76`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 76-87 (`for (let i = 0; i < 5; i++) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f2172828-2 name-for-general-behavior `packages/core/echo/echo-host/src/db-host/feed-data-source.ts:34`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.80. The likeliest place is lines 34-45 (`export class FeedDataSource implements IndexDataSource {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f2172828-3 no-casts `packages/core/echo/feed/src/feed-store.test.ts:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 354-377 (`expect(feed1Res.nextCursor).toBeDefined();`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f2172828-4 no-casts `packages/core/echo/feed/src/feed-store.ts:540`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 540-563 (`const privateIds = JSON.parse(feedPrivateIds) as number[];`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `362fd0f7bcf94a49bd1fca8b53a478f6f3e21383`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 166 uncertain, 75 clean, 0 unanswered
- left for an agentic reviewer: 48 batch(es)

```text
requests: 222 (105 verdicts re-asked with context the model requested)
estimated input tokens: 3058725
billed input tokens: 3066334 (cost $0.1288)
measured chars per token: 2.99
```

- f2172828-1: the throttle test now drives `TRACE_INDEX_DELAY_MS` with fake timers instead of real sleeps and polling.
- f2172828-2: `FeedDataSource` is the existing class name and is unchanged by this PR; out of scope.
- f2172828-3, f2172828-4: pre-existing lines (`feed-store.test.ts:354`, the `JSON.parse(...) as number[]` at `feed-store.ts:540`) this PR does not touch; out of scope.
