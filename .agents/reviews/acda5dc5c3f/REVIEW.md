---
branch: claude/home-page-performance-d500a2
commit: acda5dc5c3f86b7e8b0f13efeca2ddd1e54b2318
base: f5f09d1be1b
mode: fast
createdAt: 2026-10-08T19:14:49.421Z
isFinalized: true
groups: 63
rules: [business-logic-out-of-ui]
reviewId: acda5dc5c3f
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- acda5dc5c3f-1 - resolved - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:129

## Issues

# WARN acda5dc5c3f-1 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:129`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 129-140 (`const useDraftContext = ({ db, draft, registry, pluginManager }: UseDraftCont...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- acda5dc5c3f-1 resolved: the default-binding step `useDraftContext` repeated from `CreateChat` is now one helper, `bindChatDefaults`, used by both. The binder itself stays in the hook, since an operation cannot hand back a live binder whose bindings exist only in memory.


### System One pass

- model: jev-latest
- base for context: `f5f09d1be1b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 127 uncertain, 96 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 150 (82 verdicts re-asked with context the model requested)
estimated input tokens: 1133758
billed input tokens: 1066646 (cost $0.0448)
measured chars per token: 3.19
```
