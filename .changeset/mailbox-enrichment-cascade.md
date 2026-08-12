---
'@dxos/plugin-inbox': minor
'@dxos/plugin-projects': minor
'@dxos/types': patch
---

Mailbox enrichment cascade. `EnrichMailbox` spawns the mailbox pipelines in cost order —
deterministic extraction (contacts, subscriptions), then cheap LLM classification, then per-message
summarization — surfaced as an Enrich action on the mailbox and an `enrichMailbox` routine template.
Summaries are stored as immutable annotations on a second mailbox feed (`Mailbox.annotations`,
`ContentBlock` disposition `summary`) and merged into the message article on read. Tracking projects
now take a `scope` and a `pipeline`, choosing which operation their routine binds.
