---
branch: dm/charming-brahmagupta-bm4m2i
commit: 9775e08ab8115fe838b15dcb1835ba5bd853a572
base: 39a37c1da661f101f7b00f7c4570e815bb9f641a
mode: fast
createdAt: 2026-09-27T04:17:16.175Z
isFinalized: true
groups: 98
rules: [comment-hygiene, declare-optional-services-with-noop-layers, name-for-general-behavior, no-casts, no-sleep-in-test]
reviewId: 9775e08a
---

_2 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9775e08a-1 - resolved - no-casts - packages/core/compute/assistant/src/session/AiContext.ts:146
- 9775e08a-2 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119
- 9775e08a-3 - resolved - no-sleep-in-test - packages/core/echo/echo-host/src/db-host/echo-host.test.ts:53
- 9775e08a-4 - ignored - name-for-general-behavior - packages/core/echo/echo-host/src/db-host/feed-data-source.ts:34
- 9775e08a-5 - ignored - comment-hygiene - packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:268
- 9775e08a-6 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-space/src/operations/add-type.ts:38

## Issues

# ERROR 9775e08a-1 no-casts `packages/core/compute/assistant/src/session/AiContext.ts:146`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 146-157 (`await this._updateBindings(this.#bindingsQuery!.results);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9775e08a-2 no-casts `packages/core/echo/echo-host/src/db-host/automerge-data-source.test.ts:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 119-130 (`const doc1HeadsBefore = headsCodec.encode(getHeads(handle1.doc()!));`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9775e08a-3 no-sleep-in-test `packages/core/echo/echo-host/src/db-host/echo-host.test.ts:53`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 53-64 (`onTestFinished(async () => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9775e08a-4 name-for-general-behavior `packages/core/echo/echo-host/src/db-host/feed-data-source.ts:34`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.80. The likeliest place is lines 34-45 (`export class FeedDataSource implements IndexDataSource {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9775e08a-5 comment-hygiene `packages/core/echo/echo-host/src/db-host/query-invalidation.test.ts:268`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.90. The likeliest place is lines 268-278 (`// ---------------------------------------------------------------------------`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9775e08a-6 declare-optional-services-with-noop-layers `packages/plugins/plugin-space/src/operations/add-type.ts:38`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 38-49 (`const pluginManager = yield* Effect.serviceOption(Plugin.Service);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `39a37c1da661f101f7b00f7c4570e815bb9f641a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 356 uncertain, 322 clean, 0 unanswered

```text
requests: 452 (238 verdicts re-asked with context the model requested)
estimated input tokens: 4148757
billed input tokens: 4062839 (cost $0.1706)
measured chars per token: 3.06
```
