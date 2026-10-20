---
branch: claude/projects-plugins-ontology-hlljzm
commit: 8e0294e5924abf3216d85ee70061e7f23bcbd180
base: 3b37cd1b778f0d120710db075f2d33b93a51772a
mode: fast
createdAt: 2026-10-20T05:26:13.416Z
isFinalized: true
groups: 135
rules: [atom-lifetime-bound-to-owner, story-for-new-ui-component]
reviewId: 8e0294e5
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8e0294e5-1 - resolved - story-for-new-ui-component - packages/plugins/plugin-projects/src/components/ObjectAddPicker/ObjectAddPicker.tsx:26
- 8e0294e5-2 - ignored - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:159

## Issues

# WARN 8e0294e5-1 story-for-new-ui-component `packages/plugins/plugin-projects/src/components/ObjectAddPicker/ObjectAddPicker.tsx:26`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 26-37 (`export const ObjectAddPicker = ({ db, filter, exclude, trigger, onSelect, onC...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e0294e5-2 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:159`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.88. The likeliest place is lines 159-170 (`export const createDynamicProjection = ({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3b37cd1b778f0d120710db075f2d33b93a51772a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 332 uncertain, 418 clean, 0 unanswered
- left for an agentic reviewer: 74 batch(es)

```text
requests: 453 (219 verdicts re-asked with context the model requested)
estimated input tokens: 2760600
billed input tokens: 2611583 (cost $0.1097)
measured chars per token: 3.17
```
