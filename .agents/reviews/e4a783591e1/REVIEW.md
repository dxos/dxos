---
branch: claude/react-ui-next-design-4db6eb
commit: e4a783591e1cb33be03b20a4b9680104b2636a99
base: 5594031ab92247c91c387af4f0ca1a3a3899ce2a
mode: fast
createdAt: 2026-10-06T07:23:41.560Z
isFinalized: true
groups: 57
rules: [no-styling-wrapper-divs, use-context-scoped-cancellation]
reviewId: e4a783591e1
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e4a783591e1-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- e4a783591e1-2 - resolved - use-context-scoped-cancellation - packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:241

## Issues

# WARN e4a783591e1-1 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN e4a783591e1-2 use-context-scoped-cancellation `packages/ui/ui-editor/src/extensions/collab/awareness/awareness.ts:241`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 241-252 (`const scheduleHide = (view: EditorView) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5594031ab92247c91c387af4f0ca1a3a3899ce2a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 47 uncertain, 30 clean, 0 unanswered
- left for an agentic reviewer: 42 batch(es)

```text
requests: 48 (20 verdicts re-asked with context the model requested)
estimated input tokens: 392719
billed input tokens: 396746 (cost $0.0167)
measured chars per token: 2.97
```
