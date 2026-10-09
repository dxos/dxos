---
branch: claude/home-page-performance-d500a2
commit: 865cc27a561fd41e63f60a8a7985925af3d9f0a9
base: origin/claude/home-page-performance-d500a2
mode: fast
createdAt: 2026-10-09T20:01:46.802Z
isFinalized: true
groups: 63
rules: [business-logic-out-of-ui]
reviewId: 865cc27a561
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 865cc27a561-1 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:134

## Issues

# WARN 865cc27a561-1 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:134`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 134-145 (`const useDraftContext = ({ db, draft, registry, pluginManager }: UseDraftCont...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

- 865cc27a561-1 ignored: the new-chat binding step is shared with `CreateChat` through `bindChatDefaults`. The binder stays in `useDraftContext` because an operation cannot hand back a live binder whose bindings exist only in memory until send.


### System One pass

- model: jev-latest
- base for context: `origin/claude/home-page-performance-d500a2`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 135 uncertain, 89 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 155 (94 verdicts re-asked with context the model requested)
estimated input tokens: 1202496
billed input tokens: 1135728 (cost $0.0477)
measured chars per token: 3.18
```
