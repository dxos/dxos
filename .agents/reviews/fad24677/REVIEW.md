---
branch: dm/awesome-bohr-vwkzh8
commit: fad24677e8f51115bac134dd1f4f4c8efce5d971
base: caa52a9404f5935c3d7a875c18aeac659a6ff151
mode: fast
createdAt: 2026-10-02T09:39:56.192Z
isFinalized: true
groups: 71
rules: [declare-optional-services-with-noop-layers, no-casts, no-styling-wrapper-divs]
reviewId: fad24677
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- fad24677-1 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:101
- fad24677-2 - ignored - no-casts - packages/core/compute/assistant/src/request/AiRequest.ts:368
- fad24677-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:345

## Issues

# WARN fad24677-1 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:101`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 101-112 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR fad24677-2 no-casts `packages/core/compute/assistant/src/request/AiRequest.ts:368`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 368-379 (`emitPartial: true,`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN fad24677-3 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:345`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 345-356 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `caa52a9404f5935c3d7a875c18aeac659a6ff151`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 191 uncertain, 148 clean, 0 unanswered
- left for an agentic reviewer: 57 batch(es)

```text
requests: 219 (128 verdicts re-asked with context the model requested)
estimated input tokens: 1923498
billed input tokens: 1866694 (cost $0.0784)
measured chars per token: 3.09
```
