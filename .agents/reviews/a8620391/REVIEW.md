---
branch: claude/busy-davinci-zmudz9
commit: a862039158c5393a4bbb3d9044712452d43b9d9b
base: e1d098457349080fa832b6b0356c894aa6fbf209
mode: fast
createdAt: 2026-10-09T10:42:20.265Z
isFinalized: true
groups: 54
rules: [comment-hygiene, error-messages-carry-context, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, use-context-scoped-cancellation]
reviewId: a8620391
---

_3 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a8620391-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:641
- a8620391-2 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1034
- a8620391-3 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1298
- a8620391-4 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1778
- a8620391-5 - ignored - no-sleep-in-test - packages/core/echo/echo-host/src/automerge/automerge-subduction.test.ts:569
- a8620391-6 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/echo-network-adapter.test.ts:254
- a8620391-7 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:370
- a8620391-8 - ignored - namespace-brand-key-prefixing - packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:370
- a8620391-9 - ignored - comment-hygiene - packages/core/protocols/src/automerge.ts:1
- a8620391-10 - ignored - namespace-brand-key-prefixing - packages/core/protocols/src/automerge.ts:11

## Issues

# WARN a8620391-1 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:641`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 641-664 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `_runSubductionMigrations` is not touched by this diff.

# WARN a8620391-2 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1034`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.87. The likeliest place is lines 1034-1057 (`throw new Error('Cannot prefil document id when not importing an existing doc');`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The `prefil document id` throw is not touched by this diff.

# ERROR a8620391-3 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1298`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 1298-1321 (`const handle = this._repo.getHandle(documentId as any);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The `getHandle(documentId as any)` cast predates this diff; the diff adds no cast.

# WARN a8620391-4 use-context-scoped-cancellation `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1778`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 1778-1801 (`}`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `_leaseUntilSettled`'s timer predates this diff; the diff's only change near it is the `since` field on the diverged entry.

# WARN a8620391-5 no-sleep-in-test `packages/core/echo/echo-host/src/automerge/automerge-subduction.test.ts:569`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 569-592 (`await transportB.disconnect();`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The `sleep(500)` is in the pre-existing crash-recovery test; the new `commit on a fragment head` tests await their sync rounds and never sleep.

# ERROR a8620391-6 no-casts `packages/core/echo/echo-host/src/automerge/echo-network-adapter.test.ts:254`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 254-265 (`await callbacks.onStartReplication!(create(PeerInfoSchema, { id: peerId }), P...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `onStartReplication!` is in the pre-existing `connectPeer` helper; the new test adds no cast.

# ERROR a8620391-7 no-casts `packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:370`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 370-378 (`export const createEchoPeerMetadata = (): PeerMetadata =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `createEchoPeerMetadata` is not touched by this diff.

# WARN a8620391-8 namespace-brand-key-prefixing `packages/core/echo/echo-host/src/automerge/echo-network-adapter.ts:370`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.84. The likeliest place is lines 370-378 (`export const createEchoPeerMetadata = (): PeerMetadata =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `createEchoPeerMetadata` is not touched by this diff.

# WARN a8620391-9 comment-hygiene `packages/core/protocols/src/automerge.ts:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 1-10 (`//`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The file header is not touched by this diff.

# WARN a8620391-10 namespace-brand-key-prefixing `packages/core/protocols/src/automerge.ts:11`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 11-22 (`export type PeerId = string & { __peerId: true };`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** The `PeerId` brand is not touched by this diff.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e1d098457349080fa832b6b0356c894aa6fbf209`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 113 uncertain, 72 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 158 (74 verdicts re-asked with context the model requested)
estimated input tokens: 2273415
billed input tokens: 2280651 (cost $0.0958)
measured chars per token: 2.99
```
