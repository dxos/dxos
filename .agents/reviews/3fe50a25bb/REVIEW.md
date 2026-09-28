---
branch: claude/ai-service-mock-storybook-90afd6
commit: 3fe50a25bbc8a225d05370f1c2020357559e04b3
base: 85d3b3894f58bc6ad9bec5f698803d1375d9c343
mode: fast
createdAt: 2026-09-28T09:48:28.915Z
isFinalized: true
groups: 61
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs, structured-logging-not-console]
reviewId: 3fe50a25bb
---

_2 error(s), 8 warning(s)._

# WARN 3fe50a25bb-1 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:129`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 129-140 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fe50a25bb-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fe50a25bb-3 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 98-109 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fe50a25bb-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:153`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 153-164 (`<Tree`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fe50a25bb-5 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:269`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 269-292 (`},`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3fe50a25bb-6 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:671`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 671-694 (`row(last.id)!.focus();`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fe50a25bb-7 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 73-89 (`const hoverableDescriptionIcons =`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3fe50a25bb-8 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 102-127 (`const assignIndexPaths = <T extends { id: string }>(entries: TreeNodeEntry<T>...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fe50a25bb-9 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:1139`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 1139-1162 (`const element = rowRef.current;`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3fe50a25bb-10 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/ProcessTree/ProcessTree.tsx:181`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 181-192 (`const makeColumnRenderer =`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.
