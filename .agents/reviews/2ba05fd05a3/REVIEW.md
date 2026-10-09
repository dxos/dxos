---
branch: claude/home-page-performance-d500a2
commit: 2ba05fd05a3d61085651fa79c939c67d8b01999c
base: origin/claude/home-page-performance-d500a2
mode: fast
createdAt: 2026-10-09T19:37:44.726Z
isFinalized: true
groups: 63
rules: [business-logic-out-of-ui, extract-non-rendering-logic-from-component]
reviewId: 2ba05fd05a3
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2ba05fd05a3-1 - resolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:59
- 2ba05fd05a3-2 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:117

## Issues

# WARN 2ba05fd05a3-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:59`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 59-70 (`useEffect(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ba05fd05a3-2 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:117`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 117-128 (`const useDraftContext = ({ db, draft, registry, skillDefinitions }: UseDraftC...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- 2ba05fd05a3-1 resolved: the send subscription moved out of `SpaceHomePrompt` into a `useDraftSend` hook; the component only renders.
- 2ba05fd05a3-2 ignored: the new-chat binding step is already shared with `CreateChat` through `bindChatDefaults`. The binder itself stays in `useDraftContext` because an operation cannot hand back a live binder whose bindings exist only in memory until send.


### System One pass

- model: jev-latest
- base for context: `origin/claude/home-page-performance-d500a2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 131 uncertain, 92 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 155 (92 verdicts re-asked with context the model requested)
estimated input tokens: 1143943
billed input tokens: 1081700 (cost $0.0454)
measured chars per token: 3.17
```
