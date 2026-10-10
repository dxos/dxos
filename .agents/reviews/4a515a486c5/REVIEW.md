---
branch: claude/react-ui-next-design-4db6eb
commit: 4a515a486c52686f1de565880fcacb70ac08a80c
base: d8c7ab4d4f95f7196109b78263b76617a483de2f
mode: fast
createdAt: 2026-10-06T06:48:51.435Z
isFinalized: true
groups: 55
rules: [no-styling-wrapper-divs]
reviewId: 4a515a486c5
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 4a515a486c5-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68

## Issues

# WARN 4a515a486c5-1 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d8c7ab4d4f95f7196109b78263b76617a483de2f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 43 uncertain, 33 clean, 0 unanswered
- left for an agentic reviewer: 36 batch(es)

```text
requests: 48 (19 verdicts re-asked with context the model requested)
estimated input tokens: 310767
billed input tokens: 313695 (cost $0.0132)
measured chars per token: 2.97
```
