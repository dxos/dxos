---
branch: claude/react-ui-next-design-4db6eb
commit: 37943fe689790002e104872f54f022f7d7512dc5
base: 7df77b1ae977303b918e168f7865ba2dc04d2f29
mode: fast
createdAt: 2026-10-05T16:03:08.425Z
isFinalized: true
groups: 55
rules: [extract-non-rendering-logic-from-component, inline-obj-parent, no-styling-wrapper-divs]
reviewId: 37943fe6897
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 37943fe6897-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:267
- 37943fe6897-2 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- 37943fe6897-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:266

## Issues

# WARN 37943fe6897-1 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:267`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 267-278 (`onSelect={() => onChange(option.id)}`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 37943fe6897-2 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 37943fe6897-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:266`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 266-277 (`if (mode !== 'live' || !db || !type || !Type.isObject(type)) {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7df77b1ae977303b918e168f7865ba2dc04d2f29`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 104 uncertain, 82 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 134 (64 verdicts re-asked with context the model requested)
estimated input tokens: 1027055
billed input tokens: 996516 (cost $0.0419)
measured chars per token: 3.09
```
