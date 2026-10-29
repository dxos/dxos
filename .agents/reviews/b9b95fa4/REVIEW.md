---
branch: dm/practical-thompson-6xwfd7
commit: b9b95fa4bc2a9656767fa143b335e5859e6790ef
base: af8ed263e2ca3bb38652340328f8ada2e0f4ed4b
mode: fast
createdAt: 2026-10-25T11:28:03.335Z
isFinalized: true
groups: 150
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, import-as-namespace-is-all-or-nothing, log-fire-and-forget-rejections, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts]
reviewId: b9b95fa4
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b9b95fa4-1 - ignored - errors-extend-base-error - packages/common/diagram/src/dsl/convert.ts:69
- b9b95fa4-2 - ignored - namespace-brand-key-prefixing - packages/common/diagram/src/dsl/convert.ts:69
- b9b95fa4-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/common/diagram/src/dsl/convert.ts:87
- b9b95fa4-4 - ignored - namespace-export-with-internal-hiding - packages/common/diagram/src/index.ts:1
- b9b95fa4-5 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:13
- b9b95fa4-6 - ignored - log-fire-and-forget-rejections - packages/common/diagram/src/mermaid-engine.ts:1178
- b9b95fa4-7 - ignored - no-casts - packages/common/diagram/src/uml.ts:315
- b9b95fa4-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-illustrator/src/types/DrawingOperation.ts:1

## Issues

# ERROR b9b95fa4-1 errors-extend-base-error `packages/common/diagram/src/dsl/convert.ts:69`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 69-74 (`export class UnknownSourceError extends Data.TaggedError('DiagramUnknownSourc...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9b95fa4-2 namespace-brand-key-prefixing `packages/common/diagram/src/dsl/convert.ts:69`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 69-74 (`export class UnknownSourceError extends Data.TaggedError('DiagramUnknownSourc...`, location confidence 0.88). Judged with added `package` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN b9b95fa4-3 effect-fn-not-hand-wrapped-gen `packages/common/diagram/src/dsl/convert.ts:87`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 87-100 (`export const convert = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9b95fa4-4 namespace-export-with-internal-hiding `packages/common/diagram/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-12 (`export * from './content.ts';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9b95fa4-5 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.86. The likeliest place is lines 13-24 (`export * as DxSvg from './dx-svg.ts';`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9b95fa4-6 log-fire-and-forget-rejections `packages/common/diagram/src/mermaid-engine.ts:1178`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.91. The likeliest place is lines 1178-1201 (`arrangements.length > 0 &&`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b9b95fa4-7 no-casts `packages/common/diagram/src/uml.ts:315`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 315-326 (`const facing = (id: string, peerId: string): string => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN b9b95fa4-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-illustrator/src/types/DrawingOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `af8ed263e2ca3bb38652340328f8ada2e0f4ed4b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 151 uncertain, 909 clean, 0 unanswered
- left for an agentic reviewer: 69 batch(es)

```text
requests: 448 (85 verdicts re-asked with context the model requested)
estimated input tokens: 4445804
billed input tokens: 4298065 (cost $0.1805)
measured chars per token: 3.10
```
