---
branch: dm/confident-lovelace-t9arta
commit: b23c274e4f6b8cbf68a539bbad4531962aa85787
base: beee1cfaab292de02c9dc545c73e32a61ed2eb93
mode: fast
createdAt: 2026-09-28T14:38:25.004Z
isFinalized: true
groups: 116
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: b23c274e4f
---

_2 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b23c274e4f-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:381
- b23c274e4f-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:81
- b23c274e4f-3 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:129
- b23c274e4f-4 - resolved - no-casts - packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts:42
- b23c274e4f-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:75
- b23c274e4f-6 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:171
- b23c274e4f-7 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:224
- b23c274e4f-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:36
- b23c274e4f-9 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:499

## Issues

# WARN b23c274e4f-1 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:381`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 381-402 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN b23c274e4f-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:81`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 81-92 (`useEffect(() => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN b23c274e4f-3 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:129`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 129-140 (`{/** Floating info. */}`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b23c274e4f-4 no-casts `packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 42-53 (`const parent = await taskSet.tasks[0].load();`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN b23c274e4f-5 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 75-84 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN b23c274e4f-6 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:171`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 171-184 (`<div className='flex justify-center items-center'>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b23c274e4f-7 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:224`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 224-235 (`<svg width={size} height={size}>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN b23c274e4f-8 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:36`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 36-47 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN b23c274e4f-9 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:499`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 499-519 (`TaskListContent.displayName = 'TaskList.Content';`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `beee1cfaab292de02c9dc545c73e32a61ed2eb93`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 163 uncertain, 759 clean, 0 unanswered

```text
requests: 405 (101 verdicts re-asked with context the model requested)
estimated input tokens: 2702609
billed input tokens: 2540317 (cost $0.1067)
measured chars per token: 3.19
```
