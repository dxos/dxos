---
branch: dm/stoic-brown-pjek5u
commit: e6c0f79ef8459aca68448995e70169e8e3aaafb8
base: a76e363c788f0dc2b302b61c68dc3aad14e66a35
mode: fast
createdAt: 2026-10-02T09:56:31.566Z
isFinalized: true
groups: 67
rules: [no-styling-wrapper-divs]
reviewId: e6c0f79e
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e6c0f79e-1 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:161

## Issues

# WARN e6c0f79e-1 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 161-172 (`}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a76e363c788f0dc2b302b61c68dc3aad14e66a35`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 109 uncertain, 153 clean, 0 unanswered
- left for an agentic reviewer: 44 batch(es)

```text
requests: 163 (82 verdicts re-asked with context the model requested)
estimated input tokens: 870216
billed input tokens: 821689 (cost $0.0345)
measured chars per token: 3.18
```
