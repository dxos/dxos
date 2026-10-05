---
branch: HEAD
commit: e6df2be1b8ec531a3490b98d9560a199651eabea
base: e36e44b0088c707d9a27fb4ccd4bfb757347e1c5
mode: fast
createdAt: 2026-10-03T15:53:59.373Z
isFinalized: true
groups: 116
rules: [errors-extend-base-error, extract-non-rendering-logic-from-component, namespace-export-with-internal-hiding, no-casts, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs]
reviewId: e6df2be1
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e6df2be1-1 - ignored - namespace-export-with-internal-hiding - packages/common/util/src/index.ts:1
- e6df2be1-2 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:369
- e6df2be1-3 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:167
- e6df2be1-4 - ignored - namespace-export-with-internal-hiding - packages/e2e/perf-harness/src/index.ts:13
- e6df2be1-5 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- e6df2be1-6 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:376
- e6df2be1-7 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:106

## Issues

# WARN e6df2be1-1 namespace-export-with-internal-hiding `packages/common/util/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-12 (`export * from './array-to-hex.ts';`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e6df2be1-2 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:369`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 369-380 (`AiParser.parseResponse({`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6df2be1-3 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:167`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 167-178 (`public async appendTurnMessage(message: Message.Message): Promise<void> {`, location confidence 0.62). Judged with added `importers, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN e6df2be1-4 namespace-export-with-internal-hiding `packages/e2e/perf-harness/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 13-25 (`export * from './collectors/marks.ts';`, location confidence 0.03). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6df2be1-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 120-143 (`const feedMessages = useQuery(`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN e6df2be1-6 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:376`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 376-408 (`>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e6df2be1-7 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:106`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 106-132 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e36e44b0088c707d9a27fb4ccd4bfb757347e1c5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 161 uncertain, 683 clean, 0 unanswered
- left for an agentic reviewer: 66 batch(es)

```text
requests: 363 (89 verdicts re-asked with context the model requested)
estimated input tokens: 3682356
billed input tokens: 3497016 (cost $0.1469)
measured chars per token: 3.16
```
