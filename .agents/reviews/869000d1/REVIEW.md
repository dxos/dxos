---
branch: HEAD
commit: 869000d1be2bf81a7ab7c000989189ba6aa1a5ed
base: 3b37cd1b778f0d120710db075f2d33b93a51772a
mode: fast
createdAt: 2026-10-20T06:32:14.880Z
isFinalized: true
groups: 80
rules: [error-messages-carry-context, log-fire-and-forget-rejections, no-casts, no-sleep-in-test, no-try-catch-in-effect-code, retries-via-schedule-with-evidence, store-events-not-projections]
reviewId: 869000d1
---

_2 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 869000d1-1 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:116
- 869000d1-2 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:380
- 869000d1-3 - ignored - no-sleep-in-test - packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:524
- 869000d1-4 - ignored - retries-via-schedule-with-evidence - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:303
- 869000d1-5 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:303
- 869000d1-6 - ignored - log-fire-and-forget-rejections - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:351
- 869000d1-7 - ignored - store-events-not-projections - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:567
- 869000d1-8 - ignored - no-casts - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:759
- 869000d1-9 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/automerge/repo-proxy.ts:951

## Issues

# ERROR 869000d1-1 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-139 (`const bytes = A.save(hostHandle.doc()!);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 869000d1-2 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:380`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.83. The likeliest place is lines 380-403 (`await waitForCondition({ condition: () => readyResolved, timeout: 300 }).catc...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 869000d1-3 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:524`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 524-547 (`});`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 869000d1-4 retries-via-schedule-with-evidence `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:303`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.90. The likeliest place is lines 303-326 (`async flush({ disk = false }: { disk?: boolean } = {}): Promise<void> {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 869000d1-5 error-messages-carry-context `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:303`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 303-326 (`async flush({ disk = false }: { disk?: boolean } = {}): Promise<void> {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 869000d1-6 log-fire-and-forget-rejections `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:351`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 351-374 (`documentIds.forEach((documentId) => this._unflushedIds.add(documentId));`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 869000d1-7 store-events-not-projections `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:567`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.83. The likeliest place is lines 567-590 (`this._isReconnecting = true;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 869000d1-8 no-casts `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:759`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 759-782 (`spaceId: this._spaceId,`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 869000d1-9 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/automerge/repo-proxy.ts:951`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 951-974 (`try {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3b37cd1b778f0d120710db075f2d33b93a51772a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 166 uncertain, 119 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 196 (108 verdicts re-asked with context the model requested)
estimated input tokens: 2594487
billed input tokens: 2596686 (cost $0.1091)
measured chars per token: 3.00
```
