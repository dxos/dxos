---
branch: claude/react-ui-next-design-4db6eb
commit: 7df77b1ae977303b918e168f7865ba2dc04d2f29
base: f855bdfdd7ea6c7e85340d76b3234c28a0414a47
mode: fast
createdAt: 2026-10-05T15:57:36.132Z
isFinalized: true
groups: 52
rules: [extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 7df77b1ae97
---

_1 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7df77b1ae97-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.stories.tsx:51
- 7df77b1ae97-2 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89
- 7df77b1ae97-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281

## Issues

# WARN 7df77b1ae97-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 51-62 (`const jsonSchema = JsonSchema.toJsonSchema(Organization.Organization);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7df77b1ae97-2 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 89-98 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7df77b1ae97-3 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 281-292 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f855bdfdd7ea6c7e85340d76b3234c28a0414a47`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 76 uncertain, 58 clean, 0 unanswered
- left for an agentic reviewer: 41 batch(es)

```text
requests: 94 (51 verdicts re-asked with context the model requested)
estimated input tokens: 554258
billed input tokens: 550513 (cost $0.0231)
measured chars per token: 3.02
```
