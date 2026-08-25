---
'@dxos/plugin-inbox': minor
'@dxos/types': patch
---

Mailbox scan cascade. `ScanMailbox` spawns the mailbox pipelines in cost order —
deterministic extraction (contacts, subscriptions), then cheap LLM classification, then per-message
summarization — surfaced as a Scan action on the mailbox and a `scanMailbox` routine template.
Summaries are stored as immutable annotations on a second mailbox feed (`Mailbox.annotations`,
`ContentBlock` disposition `summary`) and merged into the message article on read. Tracking projects
now take a `scope` and a `pipeline`, choosing which operation their routine binds.
