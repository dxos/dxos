---
branch: dm/confident-lovelace-t9arta
commit: 5b321997229a9bdfc2e0d2b54a0fadc94fe902ea
base: b23c274e4f6b8cbf68a539bbad4531962aa85787
mode: fast
createdAt: 2026-09-28T19:13:12.300Z
isFinalized: true
groups: 150
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 5b32199722
---

_6 error(s), 13 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5b32199722-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:81
- 5b32199722-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:129
- 5b32199722-3 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- 5b32199722-4 - ignored - no-casts - packages/plugins/plugin-map/src/containers/index.ts:1
- 5b32199722-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74
- 5b32199722-6 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98
- 5b32199722-7 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37
- 5b32199722-8 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151
- 5b32199722-9 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308
- 5b32199722-10 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-geo/src/components/WorldMap/WorldMap.stories.tsx:30
- 5b32199722-11 - ignored - no-casts - packages/ui/react-ui-geo/src/util/render.ts:117
- 5b32199722-12 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293
- 5b32199722-13 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711
- 5b32199722-14 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:908
- 5b32199722-15 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1064
- 5b32199722-16 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1367
- 5b32199722-17 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695
- 5b32199722-18 - ignored - error-messages-carry-context - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1305
- 5b32199722-19 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1947

## Issues

# WARN 5b32199722-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:81`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 81-92 (`useEffect(() => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:129`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 129-140 (`{/** Floating info. */}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-3 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b32199722-4 no-casts `packages/plugins/plugin-map/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 1-13 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-5 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 74-85 (`'absolute inset-y-0 end-0',`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-6 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 98-109 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-7 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 37-48 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b32199722-8 no-casts `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 151-162 (`level = '110m',`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-9 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 308-319 (`export const Earthrise = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-10 no-styling-wrapper-divs `packages/ui/react-ui-geo/src/components/WorldMap/WorldMap.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 30-41 (`const DefaultStory = ({ view }: StoryArgs) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b32199722-11 no-casts `packages/ui/react-ui-geo/src/util/render.ts:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 117-128 (`if (styles.land) {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-12 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 293-316 (`}, [rootTree, childIdsFamily, registry]);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b32199722-13 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:711`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 711-734 (`await expect(row(child)!.getAttribute('aria-setsize')).toEqual('20');`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-14 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:908`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 908-931 (`useEffect(() => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-15 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1064`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 1064-1087 (`'col-[tree-row] grid grid-cols-subgrid gap-0.5 [&[hidden]]:hidden empty:hidden',`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b32199722-16 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1367`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 1367-1390 (`aria-posinset={branch ? undefined : indexPath.at(-1)! + 1}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-17 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 695-718 (`return (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5b32199722-18 error-messages-carry-context `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1305`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1305-1328 (`throw new Error('Task mnemonic not found.');`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5b32199722-19 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1947`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1947-1970 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b23c274e4f6b8cbf68a539bbad4531962aa85787`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 19 violations written to fragments, 197 uncertain, 1071 clean, 0 unanswered

```text
requests: 589 (125 verdicts re-asked with context the model requested)
estimated input tokens: 4890632
billed input tokens: 4754033 (cost $0.1997)
measured chars per token: 3.09
```
