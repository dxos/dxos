---
branch: claude/presenter-companion-tests-docs-e9449d
commit: 79a32e99e0fed7e9af77ec5e2d5cc19201244d3c
base: 577b4347c92655f867ab9c3a5669776d67c1d7be
mode: fast
createdAt: 2026-09-29T14:35:39.287Z
isFinalized: true
groups: 96
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 79a32e99e0f
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 79a32e99e0f-1 - resolved - no-casts - packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts:9
- 79a32e99e0f-2 - resolved - no-casts - packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx:50
- 79a32e99e0f-3 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx:59
- 79a32e99e0f-4 - resolved - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx:129
- 79a32e99e0f-5 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx:132

## Issues

# ERROR 79a32e99e0f-1 no-casts `packages/e2e/composer-e2e/src/playwright/plugins/presenter.ts:9`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 9-20 (`export const Presenter = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 79a32e99e0f-2 no-casts `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx:50`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 50-58 (`const typeAtLineEnd = async (canvasElement: HTMLElement, line: string, text: ...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79a32e99e0f-3 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 59-70 (`const EditorStory = (props: RevealProps) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79a32e99e0f-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.stories.tsx:129`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 129-140 (`export const TestEditorNarrow: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 79a32e99e0f-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-presenter/src/components/RevealPlayer/RevealPlayer.tsx:132`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 132-143 (`useAsyncEffect(async (controller) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `577b4347c92655f867ab9c3a5669776d67c1d7be`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 204 uncertain, 349 clean, 0 unanswered

```text
requests: 333 (130 verdicts re-asked with context the model requested)
estimated input tokens: 1449695
billed input tokens: 1371384 (cost $0.0576)
measured chars per token: 3.17
```
