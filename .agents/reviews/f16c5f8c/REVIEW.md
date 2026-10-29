---
branch: dm/nice-hopper-92a9ib
commit: f16c5f8c01a3d2383efa29415fbcc82aafa3e708
base: 86b04453e0572e9602578c1a543dfe4033d36091
mode: fast
createdAt: 2026-10-20T06:05:03.059Z
isFinalized: true
groups: 129
rules: [atom-lifetime-bound-to-owner, no-styling-wrapper-divs]
reviewId: f16c5f8c
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f16c5f8c-1 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:43
- f16c5f8c-2 - ignored - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:171

## Issues

# WARN f16c5f8c-1 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/SpecChangelog/SpecChangelog.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 43-54 (`decorateMarkdown(),`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN f16c5f8c-2 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:171`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.88. The likeliest place is lines 171-182 (`export const createDynamicProjection = ({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `86b04453e0572e9602578c1a543dfe4033d36091`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 214 uncertain, 445 clean, 0 unanswered
- left for an agentic reviewer: 59 batch(es)

```text
requests: 350 (134 verdicts re-asked with context the model requested)
estimated input tokens: 1914267
billed input tokens: 1857318 (cost $0.0780)
measured chars per token: 3.09
```
