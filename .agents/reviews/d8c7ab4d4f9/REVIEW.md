---
branch: claude/react-ui-next-design-4db6eb
commit: d8c7ab4d4f95f7196109b78263b76617a483de2f
base: c0ce633b690b669976f15975fdb2fa512985430a
mode: fast
createdAt: 2026-10-06T06:12:16.102Z
isFinalized: true
groups: 46
rules: [business-logic-out-of-ui, diff-scoped-to-pr-purpose, no-styling-wrapper-divs]
reviewId: d8c7ab4d4f9
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d8c7ab4d4f9-1 - ignored - diff-scoped-to-pr-purpose - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:62
- d8c7ab4d4f9-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256
- d8c7ab4d4f9-3 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47
- d8c7ab4d4f9-4 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:108

## Issues

# WARN d8c7ab4d4f9-1 diff-scoped-to-pr-purpose `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:62`

System One judges this a likely violation of `diff-scoped-to-pr-purpose` (Keep a diff scoped to what the PR says it does; drop unrelated or accidental hunks), p=0.85. This is a single-shot classifier: confirm against the rule before acting.

# WARN d8c7ab4d4f9-2 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 256-267 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN d8c7ab4d4f9-3 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 47-58 (`if (!hubClient) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN d8c7ab4d4f9-4 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 108-119 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c0ce633b690b669976f15975fdb2fa512985430a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 101 uncertain, 107 clean, 0 unanswered
- left for an agentic reviewer: 33 batch(es)

```text
requests: 135 (57 verdicts re-asked with context the model requested)
estimated input tokens: 845886
billed input tokens: 814231 (cost $0.0342)
measured chars per token: 3.12
```
