---
branch: worktree-fix-unsupported-uri-kind
commit: d9ed24651049d7aa4266c4f2ddf798eca9094df3
base: 3b37cd1b778f0d120710db075f2d33b93a51772a
mode: fast
createdAt: 2026-10-20T12:02:58.077Z
isFinalized: true
groups: 87
rules: [error-messages-carry-context, no-casts, no-try-catch-in-effect-code, ref-collections-via-query]
reviewId: d9ed2465
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d9ed2465-1 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.test.ts:101
- d9ed2465-2 - ignored - no-casts - packages/core/echo/echo/src/internal/Ref/ref.ts:366
- d9ed2465-3 - ignored - error-messages-carry-context - packages/core/echo/echo/src/internal/Ref/ref.ts:644
- d9ed2465-4 - ignored - no-try-catch-in-effect-code - packages/sdk/schema/src/graph/space-graph.ts:295
- d9ed2465-5 - ignored - ref-collections-via-query - packages/sdk/schema/src/graph/space-graph.ts:310

## Issues

# ERROR d9ed2465-1 no-casts `packages/core/echo/echo/src/internal/Ref/ref.test.ts:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 101-112 (`const rejectionMessage = (value: unknown, options?: { readonly reportInput: t...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d9ed2465-2 no-casts `packages/core/echo/echo/src/internal/Ref/ref.ts:366`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 366-378 (`const EncodedReferenceSchema = Schema.Struct({ '/': Schema.String }) as unkno...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN d9ed2465-3 error-messages-carry-context `packages/core/echo/echo/src/internal/Ref/ref.ts:644`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 644-667 (`async load(options?: LoadOptions): Promise<T> {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN d9ed2465-4 no-try-catch-in-effect-code `packages/sdk/schema/src/graph/space-graph.ts:295`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 295-309 (`#resolveTarget(ref: Ref.Unknown): unknown {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN d9ed2465-5 ref-collections-via-query `packages/sdk/schema/src/graph/space-graph.ts:310`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.82. The likeliest place is lines 310-321 (`const getOutgoingReferences = (object: Obj.Unknown): Array<{ ref: Ref.Unknown...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3b37cd1b778f0d120710db075f2d33b93a51772a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 106 uncertain, 102 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 111 (54 verdicts re-asked with context the model requested)
estimated input tokens: 1021666
billed input tokens: 1002796 (cost $0.0421)
measured chars per token: 3.06
```
