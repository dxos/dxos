---
branch: claude/react-ui-next-design-4db6eb
commit: 5bd65a8004aace762f269294e3b2f61f715d9294
base: 4b1c38c20b1ad0ef0526b128c63e0433729b8f0f
mode: fast
createdAt: 2026-09-30T13:13:19.018Z
isFinalized: true
groups: 130
rules: [comment-hygiene, design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs]
reviewId: 5bd65a8004
---

_1 error(s), 13 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5bd65a8004-1 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/next/Listbox/Listbox.stories.tsx:58
- 5bd65a8004-2 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/next/OrderedList/OrderedList.stories.tsx:74
- 5bd65a8004-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/next/Tree/Tree.stories.tsx:158
- 5bd65a8004-4 - resolved - no-casts - packages/ui/react-ui-list/src/next/Tree/Tree.stories.tsx:185
- 5bd65a8004-5 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/next/Tree/Tree.tsx:233
- 5bd65a8004-6 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128
- 5bd65a8004-7 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:85
- 5bd65a8004-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:112
- 5bd65a8004-9 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:106
- 5bd65a8004-10 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:29
- 5bd65a8004-11 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:111
- 5bd65a8004-12 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40
- 5bd65a8004-13 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:107
- 5bd65a8004-14 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/stories.tsx:45

## Issues

# WARN 5bd65a8004-1 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/next/Listbox/Listbox.stories.tsx:58`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 58-69 (`<Next.Typography data-testid={`selected-${size}`}>{selected ?? 'None'}</Next....`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-2 no-styling-wrapper-divs `packages/ui/react-ui-list/src/next/OrderedList/OrderedList.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 74-85 (`const ScrollableStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-3 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/next/Tree/Tree.stories.tsx:158`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 158-174 (`const meta = {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5bd65a8004-4 no-casts `packages/ui/react-ui-list/src/next/Tree/Tree.stories.tsx:185`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 185-190 (`const focusedName = () => (document.activeElement as HTMLElement | null)?.tex...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-5 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/next/Tree/Tree.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 233-244 (`useEffect(() => {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-6 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 128-139 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-7 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:85`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 85-96 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-8 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:112`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 112-135 (`const [query, setQuery] = useState('');`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-9 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 106-112 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-10 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 29-40 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-11 comment-hygiene `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:111`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 111-117 (`};`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-12 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-13 comment-hygiene `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:107`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 107-118 (`const chip = content.getBoundingClientRect().height;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5bd65a8004-14 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4b1c38c20b1ad0ef0526b128c63e0433729b8f0f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 14 violations written to fragments, 121 uncertain, 1339 clean, 0 unanswered
- left for an agentic reviewer: 34 batch(es)

```text
requests: 557 (41 verdicts re-asked with context the model requested)
estimated input tokens: 4093898
billed input tokens: 3902383 (cost $0.1639)
measured chars per token: 3.15
```
