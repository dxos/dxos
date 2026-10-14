---
branch: claude/sync-performance-debug-i1xelq
commit: 33dc23e6eae16b2429d3de9da6d0466188f966f5
base: a68b20cc367810b16f6ef72a39ab7fe8eb36956a
mode: fast
createdAt: 2026-09-28T23:23:17.951Z
isFinalized: true
groups: 56
rules: [error-messages-carry-context, no-casts, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: 33dc23e6ea
---

_3 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 33dc23e6ea-1 - resolved - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:92
- 33dc23e6ea-2 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:884
- 33dc23e6ea-3 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:245
- 33dc23e6ea-4 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353
- 33dc23e6ea-5 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:476
- 33dc23e6ea-6 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:984
- 33dc23e6ea-7 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1680

## Issues

# ERROR 33dc23e6ea-1 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 92-115 (`expect(loaded.doc()!.text).toEqual('second');`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 33dc23e6ea-2 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host-subduction.test.ts:884`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 884-907 (`await sleep(NO_TRAFFIC_WINDOW_MS);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 33dc23e6ea-3 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:245`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 245-256 (`const network = await new TestReplicationNetwork().open();`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 33dc23e6ea-4 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-host.test.ts:353`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 353-364 (`await sleep(500);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 33dc23e6ea-5 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:476`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 476-499 (`let updatingAuthScope = false;`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 33dc23e6ea-6 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:984`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 984-1007 (`const handle = this._repo.import<T>(initialValue, { docId: opts?.documentId });`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 33dc23e6ea-7 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1680`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 1680-1703 (`private _leaseUntilSettled(documentId: DocumentId): void {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a68b20cc367810b16f6ef72a39ab7fe8eb36956a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 112 uncertain, 49 clean, 0 unanswered

```text
requests: 144 (65 verdicts re-asked with context the model requested)
estimated input tokens: 2544233
billed input tokens: 2538496 (cost $0.1066)
measured chars per token: 3.01
```
