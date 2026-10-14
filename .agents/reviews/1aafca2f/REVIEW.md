---
branch: dm/eager-babbage-m7oru0
commit: 1aafca2f6c0465c68b6948f36a9b14786a4ca473
base: 55bdf550975df87464bf31384c4ef9dda8ff0879
mode: fast
createdAt: 2026-10-14T06:14:14.138Z
isFinalized: true
groups: 103
rules: [reuse-shared-test-layer, story-for-new-ui-component]
reviewId: 1aafca2f
---

_0 error(s), 2 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1aafca2f-1 - ignored - reuse-shared-test-layer - packages/plugins/plugin-agent/src/capabilities/email-channel-backend.test.ts:26
- 1aafca2f-2 - resolved - story-for-new-ui-component - packages/plugins/plugin-agent/src/containers/EmailChannelProperties/EmailChannelProperties.tsx:35

## Issues

# WARN 1aafca2f-1 reuse-shared-test-layer `packages/plugins/plugin-agent/src/capabilities/email-channel-backend.test.ts:26`

**Ignored:** the fake is a `Layer.succeed(AgentMailboxService, …)` over the service this PR introduces; no shared layer for it exists to reuse, which the rule exempts.

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 26-37 (`const fakeMailbox = (spaceId: () => string) => {`, location confidence 0.93). Judged with added `siblings, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1aafca2f-2 story-for-new-ui-component `packages/plugins/plugin-agent/src/containers/EmailChannelProperties/EmailChannelProperties.tsx:35`

**Resolved:** the UI moved into `components/EmailChannelSettings` with `EmailChannelSettings.stories.tsx`; the container keeps only its hooks, as plugin-agent's other containers do.

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 35-46 (`export const EmailChannelProperties = ({ subject: channel, attendableId }: Em...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `55bdf550975df87464bf31384c4ef9dda8ff0879`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 2 violations written to fragments, 237 uncertain, 389 clean, 0 unanswered
- left for an agentic reviewer: 75 batch(es)

```text
requests: 362 (169 verdicts re-asked with context the model requested)
estimated input tokens: 1770632
billed input tokens: 1627227 (cost $0.0683)
measured chars per token: 3.26
```
