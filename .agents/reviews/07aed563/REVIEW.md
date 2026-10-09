---
branch: dm/wonderful-wright-4s740l
commit: 07aed563e41a5f5a308e4161573e0143aa01c5fb
base: 62abfd7fd2a31c85cb250588079dfc9a652b691b
mode: fast
createdAt: 2026-10-08T10:56:28.534Z
isFinalized: true
groups: 61
rules: [design-tokens-not-raw-spacing-sizing, no-casts]
reviewId: 07aed563
---

_1 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 07aed563-1 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:89
- 07aed563-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:152

## Issues

# ERROR 07aed563-1 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 89-100 (`]),`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 07aed563-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:152`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 152-163 (`))}`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `62abfd7fd2a31c85cb250588079dfc9a652b691b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 100 uncertain, 256 clean, 0 unanswered
- left for an agentic reviewer: 33 batch(es)

```text
requests: 201 (69 verdicts re-asked with context the model requested)
estimated input tokens: 869577
billed input tokens: 802377 (cost $0.0337)
measured chars per token: 3.25
```
