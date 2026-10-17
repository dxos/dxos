---
branch: dm/nice-franklin-ncvbpc
commit: c98b57726e97d005bb4364888d5b0c12031128a8
base: a7beb5124a8f975005450c4602de29c85b964e12
mode: fast
createdAt: 2026-10-17T05:58:26.976Z
isFinalized: true
groups: 121
rules: [code-not-in-strings, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, stable-component-for-optional-content]
reviewId: c98b5772
---

_3 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c98b5772-1 - unresolved - stable-component-for-optional-content - packages/apps/drawing-app/src/components/DrawingRoot.tsx:166
- c98b5772-2 - unresolved - errors-extend-base-error - packages/apps/drawing-app/src/model/bootstrap.ts:24
- c98b5772-3 - unresolved - code-not-in-strings - packages/apps/drawing-app/src/model/drawing-io.ts:12
- c98b5772-4 - unresolved - errors-extend-base-error - packages/apps/drawing-app/src/model/drawing-io.ts:24
- c98b5772-5 - resolved - errors-extend-base-error - packages/devtools/drawing/site/src/drawing.ts:23
- c98b5772-6 - resolved - effect-fn-not-hand-wrapped-gen - packages/devtools/drawing/site/src/drawing.ts:33

## Issues

# WARN c98b5772-1 stable-component-for-optional-content `packages/apps/drawing-app/src/components/DrawingRoot.tsx:166`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.83. The likeliest place is lines 166-177 (`key={opened.drawing.id}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c98b5772-2 errors-extend-base-error `packages/apps/drawing-app/src/model/bootstrap.ts:24`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 24-28 (`export class LoadError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c98b5772-3 code-not-in-strings `packages/apps/drawing-app/src/model/drawing-io.ts:12`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.82. The likeliest place is lines 12-23 (`export const STARTER_SOURCE = `diagram aspect=16:9`, location confidence 0.99). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR c98b5772-4 errors-extend-base-error `packages/apps/drawing-app/src/model/drawing-io.ts:24`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 24-28 (`export class CompileError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c98b5772-5 errors-extend-base-error `packages/devtools/drawing/site/src/drawing.ts:23`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 23-32 (`export class RenderError extends Data.TaggedError('DrawingRenderError')<{ rea...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c98b5772-6 effect-fn-not-hand-wrapped-gen `packages/devtools/drawing/site/src/drawing.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 33-47 (`export const draw = (text: string, name: string = HERO): Effect.Effect<Drawin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a7beb5124a8f975005450c4602de29c85b964e12`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 201 uncertain, 514 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 402 (142 verdicts re-asked with context the model requested)
estimated input tokens: 1667142
billed input tokens: 1552823 (cost $0.0652)
measured chars per token: 3.22
```
