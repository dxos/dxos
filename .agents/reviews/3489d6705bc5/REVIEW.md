---
branch: dm/drawing-share-link
commit: 3489d6705bc545ba551e2b20eb43225a836da60a
base: 40271d566e8d69d0558fe32548a9922e0c67786f
mode: fast
createdAt: 2026-10-19T09:07:08.428Z
isFinalized: true
groups: 81
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, no-try-catch-in-effect-code, stable-component-for-optional-content, structured-logging-not-console]
reviewId: 3489d6705bc5
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3489d6705bc5-1 - ignored - stable-component-for-optional-content - packages/apps/drawing-app/src/components/DrawingRoot.tsx:184
- 3489d6705bc5-2 - resolved - no-try-catch-in-effect-code - packages/apps/drawing-app/src/worker/share.ts:116
- 3489d6705bc5-3 - ignored - structured-logging-not-console - packages/apps/drawing-app/src/worker/share.ts:196
- 3489d6705bc5-4 - resolved - effect-fn-not-hand-wrapped-gen - packages/devtools/drawing/src/bin/cli.ts:91
- 3489d6705bc5-5 - ignored - structured-logging-not-console - packages/devtools/drawing/src/bin/cli.ts:184
- 3489d6705bc5-6 - resolved - errors-extend-base-error - packages/devtools/drawing/src/open.ts:1

## Issues

# WARN 3489d6705bc5-1 stable-component-for-optional-content `packages/apps/drawing-app/src/components/DrawingRoot.tsx:184`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 184-195 (`key={opened.drawing.id}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3489d6705bc5-2 no-try-catch-in-effect-code `packages/apps/drawing-app/src/worker/share.ts:116`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 116-127 (`return respond(request, `A drawing's source is limited to ${MAX_SOURCE_BYTES}...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3489d6705bc5-3 structured-logging-not-console `packages/apps/drawing-app/src/worker/share.ts:196`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 196-212 (`export const handleShare = async (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3489d6705bc5-4 effect-fn-not-hand-wrapped-gen `packages/devtools/drawing/src/bin/cli.ts:91`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 91-102 (`const openDiagram = (file: string, { print }: { print: boolean }): Effect.Eff...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3489d6705bc5-5 structured-logging-not-console `packages/devtools/drawing/src/bin/cli.ts:184`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 184-195 (`(values.out === '-' ? console.error : console.log)(`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3489d6705bc5-6 errors-extend-base-error `packages/devtools/drawing/src/open.ts:1`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 1-25 (`import * as Data from 'effect/Data';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `40271d566e8d69d0558fe32548a9922e0c67786f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 202 uncertain, 310 clean, 0 unanswered
- left for an agentic reviewer: 60 batch(es)

```text
requests: 294 (145 verdicts re-asked with context the model requested)
estimated input tokens: 1680344
billed input tokens: 1596279 (cost $0.0670)
measured chars per token: 3.16
```
