---
branch: claude/react-ui-next-design-4db6eb
commit: d4b03215e441be5965d30d2303252a5dfbb50687
base: 8e9e3d6a66f07f45304ac9ac165adaa92db81466
mode: fast
createdAt: 2026-10-06T12:57:16.831Z
isFinalized: true
groups: 64
rules: [extract-non-rendering-logic-from-component, inline-obj-parent, no-styling-wrapper-divs, use-context-scoped-cancellation]
reviewId: d4b03215e44
---

_0 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d4b03215e44-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:296
- d4b03215e44-2 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:571
- d4b03215e44-3 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- d4b03215e44-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- d4b03215e44-5 - ignored - use-context-scoped-cancellation - packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:245

## Issues

# WARN d4b03215e44-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:296`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 296-319 (`const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN d4b03215e44-2 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:571`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 571-594 (`classNames='text-lg flex-row-reverse justify-end'`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN d4b03215e44-3 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d4b03215e44-4 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN d4b03215e44-5 use-context-scoped-cancellation `packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:245`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 245-256 (`const scheduleHide = (view: EditorView) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `8e9e3d6a66f07f45304ac9ac165adaa92db81466`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 122 uncertain, 68 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 136 (65 verdicts re-asked with context the model requested)
estimated input tokens: 1667297
billed input tokens: 1678925 (cost $0.0705)
measured chars per token: 2.98
```
