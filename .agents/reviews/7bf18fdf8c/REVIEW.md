---
branch: dm/admiring-cannon-2z7let
commit: 7bf18fdf8cf691326c204d0f0429703905528257
base: b440559823fb87ed1a4590dab21ae924d4d76c3a
mode: fast
createdAt: 2026-10-19T06:42:11.089Z
isFinalized: true
groups: 86
rules: [extract-non-rendering-logic-from-component, intents-not-coordinates]
reviewId: 7bf18fdf8c
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7bf18fdf8c-1 - ignored - intents-not-coordinates - packages/ui/react-ui-canvas/src/components/Canvas/Canvas.tsx:1240
- 7bf18fdf8c-2 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/Canvas/Canvas.tsx:1528

## Issues

# ERROR 7bf18fdf8c-1 intents-not-coordinates `packages/ui/react-ui-canvas/src/components/Canvas/Canvas.tsx:1240`

System One judges this a likely violation of `intents-not-coordinates` (The surface emits intents; only a projection writes coordinates), p=0.82. The likeliest place is lines 1240-1263 (`if (drag?.kind === 'link' && isLinkDrawn(drag, minor) && (drag.target || isPo...`, location confidence 0.95). Judged with added `imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7bf18fdf8c-2 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/Canvas/Canvas.tsx:1528`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 1528-1551 (`const focus = useMemo(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b440559823fb87ed1a4590dab21ae924d4d76c3a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 107 uncertain, 113 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 162 (79 verdicts re-asked with context the model requested)
estimated input tokens: 2526993
billed input tokens: 2573664 (cost $0.1081)
measured chars per token: 2.95
```
