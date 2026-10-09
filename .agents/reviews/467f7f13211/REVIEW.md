---
branch: claude/react-ui-next-design-4db6eb
commit: 467f7f13211a4d665decb59ba2636a00f0b9d99a
base: a658af68b103c7feb7b1bc12349a879b7a751bbe
mode: fast
createdAt: 2026-10-04T03:58:47.293Z
isFinalized: true
groups: 106
rules: [namespace-export-with-internal-hiding, no-casts, no-styling-wrapper-divs]
reviewId: 467f7f13211
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 467f7f13211-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:126
- 467f7f13211-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:141
- 467f7f13211-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699
- 467f7f13211-4 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1034
- 467f7f13211-5 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:298
- 467f7f13211-6 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-task/src/index.ts:1

## Issues

# WARN 467f7f13211-1 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 126-137 (`</Form.Root>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 467f7f13211-2 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 141-152 (`against the content's edge is where the eye reads it, and a third track would...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 467f7f13211-3 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 699-722 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 467f7f13211-4 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1034`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1034-1057 (`export const TestArtifactsHiddenInRow: Story = {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 467f7f13211-5 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:298`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 298-314 (`type TaskListViewportProps = ComposableProps<{`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 467f7f13211-6 namespace-export-with-internal-hiding `packages/ui/react-ui-task/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.90. The likeliest place is lines 1-11 (`export * from './components/task-grid.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a658af68b103c7feb7b1bc12349a879b7a751bbe`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 165 uncertain, 720 clean, 0 unanswered
- left for an agentic reviewer: 56 batch(es)

```text
requests: 399 (79 verdicts re-asked with context the model requested)
estimated input tokens: 3723881
billed input tokens: 3626860 (cost $0.1523)
measured chars per token: 3.08
```
