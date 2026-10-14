---
branch: claude/ai-service-mock-storybook-90afd6
commit: ddd888c0e46f15a18d56155c28cacb5b520a8a2d
base: b8e3dd8b32db4f2dec7ee38f364e79cd7e6efb43
mode: fast
createdAt: 2026-09-28T10:22:07.116Z
isFinalized: true
groups: 61
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: ddd888c0e4
---

_2 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ddd888c0e4-1 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:129
- ddd888c0e4-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- ddd888c0e4-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98
- ddd888c0e4-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:153
- ddd888c0e4-5 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:269
- ddd888c0e4-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293
- ddd888c0e4-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:73
- ddd888c0e4-8 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:340
- ddd888c0e4-9 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:502
- ddd888c0e4-10 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:180

## Issues

# WARN ddd888c0e4-1 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:129`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 129-140 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddd888c0e4-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddd888c0e4-3 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 98-109 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddd888c0e4-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:153`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 153-164 (`<Tree`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ddd888c0e4-5 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:269`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 269-292 (`source: source.data as TreeData,`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddd888c0e4-6 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 293-316 (`<Tree`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddd888c0e4-7 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 73-89 (`const hoverableDescriptionIcons =`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ddd888c0e4-8 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:340`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 340-357 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddd888c0e4-9 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:502`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 502-525 (`}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN ddd888c0e4-10 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:180`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 180-191 (`const makeColumnRenderer =`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b8e3dd8b32db4f2dec7ee38f364e79cd7e6efb43`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 10 violations written to fragments, 158 uncertain, 158 clean, 0 unanswered

```text
requests: 235 (87 verdicts re-asked with context the model requested)
estimated input tokens: 2161631
billed input tokens: 2159282 (cost $0.0907)
measured chars per token: 3.00
```
