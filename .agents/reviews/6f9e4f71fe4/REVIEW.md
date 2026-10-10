---
branch: claude/react-ui-next-design-4db6eb
commit: 6f9e4f71fe477e26790a5050790402fbd6f40f48
base: 4e4760b50db6f10cbd645a059a6364a249d82f74
mode: fast
createdAt: 2026-10-04T14:36:10.606Z
isFinalized: true
groups: 56
rules: [design-tokens-not-raw-spacing-sizing, no-styling-wrapper-divs]
reviewId: 6f9e4f71fe4
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6f9e4f71fe4-1 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85
- 6f9e4f71fe4-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87

## Issues

# WARN 6f9e4f71fe4-1 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 85-96 (`/>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6f9e4f71fe4-2 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 87-100 (`{subjects.map((subject) => (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4e4760b50db6f10cbd645a059a6364a249d82f74`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 87 uncertain, 146 clean, 0 unanswered
- left for an agentic reviewer: 36 batch(es)

```text
requests: 143 (43 verdicts re-asked with context the model requested)
estimated input tokens: 868538
billed input tokens: 823936 (cost $0.0346)
measured chars per token: 3.16
```
