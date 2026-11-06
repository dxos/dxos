---
branch: dm/busy-sagan-fkj09r
commit: fcad02093174e294b3ef55b17fc07bd19e9b1440
base: 812ae9499ad085f3f0581e49ee76a428b91b6e43
mode: fast
createdAt: 2026-11-02T18:41:28.265Z
isFinalized: true
groups: 90
rules: [consistent-private-field-convention, deferred-callback-owns-its-context, inline-obj-parent, no-casts, no-module-level-object-caches, no-try-catch-in-effect-code]
reviewId: fcad0209
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fcad0209-1 - ignored - consistent-private-field-convention - packages/core/echo/echo-client/src/core-db/entity-manager.ts:226
- fcad0209-2 - ignored - no-try-catch-in-effect-code - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2025
- fcad0209-3 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2330
- fcad0209-4 - ignored - deferred-callback-owns-its-context - packages/core/echo/echo-client/src/core-db/entity-manager.ts:2810
- fcad0209-5 - ignored - no-module-level-object-caches - packages/core/echo/echo-client/src/core-db/object-core.ts:44
- fcad0209-6 - ignored - no-casts - packages/core/echo/echo-client/src/core-db/object-core.ts:909
- fcad0209-7 - resolved - inline-obj-parent - packages/core/echo/echo-client/src/query/working-set-view.test.ts:51

## Issues

# WARN fcad0209-1 consistent-private-field-convention `packages/core/echo/echo-client/src/core-db/entity-manager.ts:226`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.86. The likeliest place is lines 226-249 (`#directory: { json: DirectoryJson; text: string } | undefined = undefined;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN fcad0209-2 no-try-catch-in-effect-code `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2025`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 2025-2048 (`const json: DirectoryJson = JSON.parse(text);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fcad0209-3 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2330`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 2330-2353 (`private _getLinkedDocumentUrl(objectId: string): AutomergeUrl | undefined {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN fcad0209-4 deferred-callback-owns-its-context `packages/core/echo/echo-client/src/core-db/entity-manager.ts:2810`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.82. The likeliest place is lines 2810-2833 (`const unsubscribe = request.stateChanged.on(this._ctx, () => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN fcad0209-5 no-module-level-object-caches `packages/core/echo/echo-client/src/core-db/object-core.ts:44`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.85. The likeliest place is lines 44-64 (`export interface IDatabaseBinding {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fcad0209-6 no-casts `packages/core/echo/echo-client/src/core-db/object-core.ts:909`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 909-932 (`return this.getDecoded([META_NAMESPACE]) as unknown as EntityMeta;`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN fcad0209-7 inline-obj-parent `packages/core/echo/echo-client/src/query/working-set-view.test.ts:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.88. The likeliest place is lines 51-62 (`});`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `812ae9499ad085f3f0581e49ee76a428b91b6e43`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 226 uncertain, 149 clean, 0 unanswered
- left for an agentic reviewer: 76 batch(es)

```text
requests: 311 (141 verdicts re-asked with context the model requested)
estimated input tokens: 4479811
billed input tokens: 4533429 (cost $0.1904)
measured chars per token: 2.96
```
