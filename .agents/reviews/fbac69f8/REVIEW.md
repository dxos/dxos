---
branch: dm/wizardly-fermat-m9272u
commit: fbac69f8a276968527c81cc6e44502c5ad2abc6c
base: c7cc480e53fa95774882485a90ebcdb06bbb4f94
mode: fast
createdAt: 2026-10-02T11:20:18.436Z
isFinalized: true
groups: 106
rules: [declare-optional-services-with-noop-layers, no-casts, scope-multi-tenant-queries-by-space, use-context-scoped-cancellation]
reviewId: fbac69f8
---

_5 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fbac69f8-1 - ignored - use-context-scoped-cancellation - packages/core/echo/echo-client/src/feed/feed-handle.ts:726
- fbac69f8-2 - ignored - no-casts - packages/core/echo/echo-client/src/feed/feed.test.ts:651
- fbac69f8-3 - ignored - no-casts - packages/core/echo/echo/src/Query.ts:357
- fbac69f8-4 - ignored - no-casts - packages/core/echo/feed/src/feed-store.test.ts:354
- fbac69f8-5 - ignored - no-casts - packages/core/echo/feed/src/feed-store.ts:1066
- fbac69f8-6 - ignored - scope-multi-tenant-queries-by-space - packages/core/echo/index-core/src/index-tracker.ts:151
- fbac69f8-7 - ignored - no-casts - packages/core/protocols/src/FeedProtocol.ts:440
- fbac69f8-8 - ignored - declare-optional-services-with-noop-layers - packages/sdk/client-services/src/internal/services/service-stack.ts:77

## Issues

# WARN fbac69f8-1 use-context-scoped-cancellation `packages/core/echo/echo-client/src/feed/feed-handle.ts:726`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.89. The likeliest place is lines 726-749 (`},`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fbac69f8-2 no-casts `packages/core/echo/echo-client/src/feed/feed.test.ts:651`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 651-674 (`const container = yield* Database.add(Obj.make(TestSchema.Container, {}));`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fbac69f8-3 no-casts `packages/core/echo/echo/src/Query.ts:357`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 357-380 (`class QueryClass implements Any {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fbac69f8-4 no-casts `packages/core/echo/feed/src/feed-store.test.ts:354`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 354-377 (`expect(feed1Res.nextCursor).toBeDefined();`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fbac69f8-5 no-casts `packages/core/echo/feed/src/feed-store.ts:1066`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1066-1077 (`const key = block.feedId!;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN fbac69f8-6 scope-multi-tenant-queries-by-space `packages/core/echo/index-core/src/index-tracker.ts:151`

System One judges this a likely violation of `scope-multi-tenant-queries-by-space` (Every space-scoped query and key leads with spaceId), p=0.82. The likeliest place is lines 151-162 (`);`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fbac69f8-7 no-casts `packages/core/protocols/src/FeedProtocol.ts:440`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 440-447 (`export const isWellKnownNamespace = (namespace: string) =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN fbac69f8-8 declare-optional-services-with-noop-layers `packages/sdk/client-services/src/internal/services/service-stack.ts:77`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 77-88 (`export const registerReplicator = <Self>(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c7cc480e53fa95774882485a90ebcdb06bbb4f94`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 221 uncertain, 889 clean, 0 unanswered
- left for an agentic reviewer: 53 batch(es)

```text
requests: 532 (143 verdicts re-asked with context the model requested)
estimated input tokens: 6071711
billed input tokens: 5887886 (cost $0.2473)
measured chars per token: 3.09
```

- fbac69f8-1: the reconnect `setTimeout` in `#subscribeToFeed` predates this PR; the PR adds only `objects`, `subscriptionReady` and `queryObjects` to `FeedHandle`.
- fbac69f8-2: `feed.test.ts:651` is an existing test; the tests this PR adds have no casts.
- fbac69f8-3: `QueryClass` predates this PR; the PR's change in `Query.ts` (the feed scope's `namespace`) has no cast.
- fbac69f8-4: pre-existing line (`feed-store.test.ts:354`), also ignored in review f2172828.
- fbac69f8-5: `block.feedId!` in `appendLocal` predates this PR; `pruneBlocks` has no cast (`sql<…>` is a row type parameter).
- fbac69f8-6: `hasResourceCursors` / `deleteResourceCursors` deliberately span every space: they retire a feed namespace the host no longer indexes anywhere, so there is no space to lead with.
- fbac69f8-7: the `as any` in `isWellKnownNamespace` predates this PR; the added `isIndexedNamespace` has no cast.
- fbac69f8-8: `registerReplicator` predates this PR; the PR only passes `feedRetention` to `EchoHostLayer`.
