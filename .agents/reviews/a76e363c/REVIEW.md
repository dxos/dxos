---
branch: dm/stoic-brown-pjek5u
commit: a76e363c788f0dc2b302b61c68dc3aad14e66a35
base: 362fd0f7bcf94a49bd1fca8b53a478f6f3e21383
mode: fast
createdAt: 2026-10-02T09:43:14.239Z
isFinalized: true
groups: 61
rules: [business-logic-out-of-ui, no-styling-wrapper-divs]
reviewId: a76e363c
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a76e363c-1 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:242
- a76e363c-2 - resolved - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/FeedbackPanel/ReportToProjectAction.tsx:72

## Issues

# WARN a76e363c-1 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:242`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 242-253 (`<div className='flex flex-col w-full gap-form-gap pt-form-padding' data-testi...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN a76e363c-2 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/FeedbackPanel/ReportToProjectAction.tsx:72`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 72-83 (`const useReportToProject = (`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `362fd0f7bcf94a49bd1fca8b53a478f6f3e21383`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 145 uncertain, 232 clean, 0 unanswered
- left for an agentic reviewer: 40 batch(es)

```text
requests: 240 (93 verdicts re-asked with context the model requested)
estimated input tokens: 1137315
billed input tokens: 1078257 (cost $0.0453)
measured chars per token: 3.16
```
