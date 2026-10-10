---
branch: dm/awesome-hawking-5110zl
commit: 42cff2098f24c66a2866899a3825feab14517886
base: 539aaea4bf99c1e60f9ab64c88e30d471c8e2cb1
mode: fast
createdAt: 2026-10-04T06:35:47.828Z
isFinalized: true
groups: 58
rules: [errors-extend-base-error, import-as-namespace-is-all-or-nothing, namespace-export-with-internal-hiding]
reviewId: 42cff209
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 42cff209-1 - ignored - namespace-export-with-internal-hiding - packages/common/diagram/src/index.ts:1
- 42cff209-2 - ignored - import-as-namespace-is-all-or-nothing - packages/common/diagram/src/index.ts:13
- 42cff209-3 - resolved - errors-extend-base-error - packages/plugins/plugin-illustrator/src/model/drawing-file.ts:92

## Issues

# WARN 42cff209-1 namespace-export-with-internal-hiding `packages/common/diagram/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-12 (`export * from './content.ts';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 42cff209-2 import-as-namespace-is-all-or-nothing `packages/common/diagram/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 13-24 (`export * as Layout from './layout.ts';`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 42cff209-3 errors-extend-base-error `packages/plugins/plugin-illustrator/src/model/drawing-file.ts:92`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 92-100 (`export const fromDxSvg = (svg: string): Effect.Effect<Payload | undefined, Sc...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `539aaea4bf99c1e60f9ab64c88e30d471c8e2cb1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 125 uncertain, 237 clean, 0 unanswered
- left for an agentic reviewer: 34 batch(es)

```text
requests: 217 (81 verdicts re-asked with context the model requested)
estimated input tokens: 1880864
billed input tokens: 1818207 (cost $0.0764)
measured chars per token: 3.10
```
