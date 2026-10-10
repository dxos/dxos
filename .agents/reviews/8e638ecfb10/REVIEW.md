---
branch: claude/tarry-window-drag-areas-4cf297
commit: 8e638ecfb10b8503469f9696de5ba75d6bdf93e3
base: 2df111410b8da2e3d14f547164627aac2d2172eb
mode: fast
createdAt: 2026-10-02T18:00:48.926Z
isFinalized: true
groups: 63
rules: [design-tokens-not-raw-spacing-sizing, no-casts, no-styling-wrapper-divs, toolbars-are-menu-actions]
reviewId: 8e638ecfb10
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8e638ecfb10-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:76
- 8e638ecfb10-2 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:162
- 8e638ecfb10-3 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193
- 8e638ecfb10-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:380
- 8e638ecfb10-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74
- 8e638ecfb10-6 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98

## Issues

# WARN 8e638ecfb10-1 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 76-87 (`data-tauri-drag-region='deep'`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e638ecfb10-2 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:162`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 162-173 (`<IconButton`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8e638ecfb10-3 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 193-204 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e638ecfb10-4 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:380`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 380-391 (`{/* Actions. */}`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e638ecfb10-5 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 74-85 (`'absolute inset-y-0 end-0',`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8e638ecfb10-6 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 98-109 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `2df111410b8da2e3d14f547164627aac2d2172eb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 159 uncertain, 168 clean, 0 unanswered
- left for an agentic reviewer: 46 batch(es)

```text
requests: 234 (89 verdicts re-asked with context the model requested)
estimated input tokens: 2484603
billed input tokens: 2456086 (cost $0.1032)
measured chars per token: 3.03
```
