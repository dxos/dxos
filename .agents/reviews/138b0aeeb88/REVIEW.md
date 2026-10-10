---
branch: claude/react-ui-next-design-4db6eb
commit: 138b0aeeb882674a866637ad261861e5f7cf8830
base: e18344a14162aa7b3b66cbc125511703aa4963ac
mode: fast
createdAt: 2026-10-03T19:29:36.724Z
isFinalized: true
groups: 56
rules: [design-tokens-not-raw-spacing-sizing, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 138b0aeeb88
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 138b0aeeb88-1 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50
- 138b0aeeb88-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86
- 138b0aeeb88-3 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695
- 138b0aeeb88-4 - ignored - error-messages-carry-context - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1343
- 138b0aeeb88-5 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1416

## Issues

# WARN 138b0aeeb88-1 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 50-53 (`const styles = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 138b0aeeb88-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 86-97 (`if (text.length === 0) {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 138b0aeeb88-3 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 695-718 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 138b0aeeb88-4 error-messages-carry-context `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1343`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.89. The likeliest place is lines 1343-1366 (`throw new Error('Description editor line not found.');`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 138b0aeeb88-5 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1416`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1416-1439 (`export const TestCreateFailureKeepsDraft: Story = {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `e18344a14162aa7b3b66cbc125511703aa4963ac`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 119 uncertain, 46 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 143 (66 verdicts re-asked with context the model requested)
estimated input tokens: 2385899
billed input tokens: 2422289 (cost $0.1017)
measured chars per token: 2.95
```
