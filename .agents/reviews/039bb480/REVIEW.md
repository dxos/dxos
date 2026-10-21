---
branch: dm/eager-babbage-m7oru0
commit: 039bb48059c78114c420a51a1a6e913779ed87af
base: bc72a37dd77d0db20c8c99fc95af4ec141b09023
mode: fast
createdAt: 2026-10-14T06:45:07.966Z
isFinalized: true
groups: 136
rules: [story-for-new-ui-component]
reviewId: 039bb480
---

_0 error(s), 1 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 039bb480-1 - ignored - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/EmailChannelProperties/EmailChannelProperties.tsx:30

## Issues

# WARN 039bb480-1 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/EmailChannelProperties/EmailChannelProperties.tsx:30`

**Ignored:** the container only wires hooks into `EmailChannelSettings`, whose stories (`EmailChannelSettings.stories.tsx`: Connected, NotConnected, Taken, Unreachable) cover every state it renders.

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 30-41 (`export const EmailChannelProperties = ({ subject: channel, attendableId }: Em...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bc72a37dd77d0db20c8c99fc95af4ec141b09023`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 1 violations written to fragments, 264 uncertain, 503 clean, 0 unanswered
- left for an agentic reviewer: 78 batch(es)

```text
requests: 432 (189 verdicts re-asked with context the model requested)
estimated input tokens: 1976418
billed input tokens: 1819563 (cost $0.0764)
measured chars per token: 3.26
```
