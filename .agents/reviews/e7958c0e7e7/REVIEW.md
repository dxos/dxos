---
branch: HEAD
commit: e7958c0e7e7ff0bae7bac5b0874f997fedade03c
base: cab8879e10ba7f1bb6538773c1d5c8677ce0172a
mode: fast
createdAt: 2026-10-03T17:30:17.559Z
isFinalized: true
groups: 49
rules: [story-for-new-ui-component]
reviewId: e7958c0e7e7
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e7958c0e7e7-1 - resolved - story-for-new-ui-component - packages/plugins/plugin-onboarding/src/components/GateContent/GateContent.tsx:13

## Issues

# WARN e7958c0e7e7-1 story-for-new-ui-component `packages/plugins/plugin-onboarding/src/components/GateContent/GateContent.tsx:13`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 13-19 (`export const GateContent = ({ children }: PropsWithChildren) => (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `cab8879e10ba7f1bb6538773c1d5c8677ce0172a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 57 uncertain, 141 clean, 0 unanswered
- left for an agentic reviewer: 30 batch(es)

```text
requests: 109 (34 verdicts re-asked with context the model requested)
estimated input tokens: 454191
billed input tokens: 437037 (cost $0.0184)
measured chars per token: 3.12
```
