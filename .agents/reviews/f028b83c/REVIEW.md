---
branch: HEAD
commit: f028b83c401569b816a2e9d05ad4339a9d421656
base: e36e44b0088c707d9a27fb4ccd4bfb757347e1c5
mode: fast
createdAt: 2026-10-03T18:13:47.320Z
isFinalized: true
groups: 54
rules: [no-styling-wrapper-divs]
reviewId: f028b83c
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f028b83c-1 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:29

## Issues

# WARN f028b83c-1 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 29-40 (`<div`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

f028b83c-1 ignored: the flagged `<div>` markup predates this PR, which changes only the `captureOwnerStack` call in `Loading.tsx`.

### System One pass

- model: jev-latest
- base for context: `e36e44b0088c707d9a27fb4ccd4bfb757347e1c5`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 45 uncertain, 96 clean, 0 unanswered
- left for an agentic reviewer: 36 batch(es)

```text
requests: 79 (30 verdicts re-asked with context the model requested)
estimated input tokens: 335320
billed input tokens: 322777 (cost $0.0136)
measured chars per token: 3.12
```
