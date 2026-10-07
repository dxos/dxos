---
branch: claude/ai-service-mock-storybook-90afd6
commit: b8e3dd8b32db4f2dec7ee38f364e79cd7e6efb43
base: 3fe50a25bbc8a225d05370f1c2020357559e04b3
mode: fast
createdAt: 2026-09-28T09:59:29.394Z
isFinalized: true
groups: 60
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: b8e3dd8b32
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b8e3dd8b32-1 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:130
- b8e3dd8b32-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74
- b8e3dd8b32-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98
- b8e3dd8b32-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293
- b8e3dd8b32-5 - ignored - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:717
- b8e3dd8b32-6 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:74
- b8e3dd8b32-7 - resolved - no-casts - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:103
- b8e3dd8b32-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:533

## Issues

# WARN b8e3dd8b32-1 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:130`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 130-141 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8e3dd8b32-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 74-85 (`'absolute inset-y-0 end-0',`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8e3dd8b32-3 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 98-109 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8e3dd8b32-4 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 293-316 (`}, [rootTree, childIdsFamily, registry]);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b8e3dd8b32-5 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:717`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 717-740 (`await expect(row(child)!.getAttribute('aria-setsize')).toEqual('20');`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8e3dd8b32-6 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 74-90 (`const hoverableDescriptionIcons =`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR b8e3dd8b32-7 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 103-128 (`const assignIndexPaths = <T extends { id: string }>(entries: TreeNodeEntry<T>...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN b8e3dd8b32-8 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:533`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 533-556 (`if (value !== pending.value) {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3fe50a25bbc8a225d05370f1c2020357559e04b3`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 143 uncertain, 130 clean, 0 unanswered

```text
requests: 211 (87 verdicts re-asked with context the model requested)
estimated input tokens: 2127472
billed input tokens: 2124747 (cost $0.0892)
measured chars per token: 3.00
```
