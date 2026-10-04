---
branch: dm/gracious-brahmagupta-6b5m46
commit: f33eb921a374ba56aa3b16260bc02cc61797539a
base: 346175bc41758ed985f7d79bec49739f9006a9e1
mode: fast
createdAt: 2026-10-02T05:38:47.417Z
isFinalized: true
groups: 72
rules: [effect-fn-not-hand-wrapped-gen, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs]
reviewId: f33eb921
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f33eb921-1 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- f33eb921-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203
- f33eb921-3 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- f33eb921-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:362

## Issues

# WARN f33eb921-1 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.81. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN f33eb921-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:203`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 203-210 (`return result.error ?? Schema.decodeUnknownSync(Schema.String)(JSON.parse(Str...`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN f33eb921-3 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 148-154 (`),`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f33eb921-4 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:362`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 362-373 (`const ToolSection = ({ label, data }: { label: string; data: unknown }) => (`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `346175bc41758ed985f7d79bec49739f9006a9e1`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 227 uncertain, 182 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 248 (155 verdicts re-asked with context the model requested)
estimated input tokens: 1978839
billed input tokens: 1889869 (cost $0.0794)
measured chars per token: 3.14
```
