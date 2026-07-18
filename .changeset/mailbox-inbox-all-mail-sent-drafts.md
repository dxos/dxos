---
'@dxos/plugin-inbox': minor
---

Restructure the mailbox nav tree around an inbox-filtered default view, with All Mail, Sent, and Drafts as sibling views rendered through the same list and message companion; drafts now appear inline on their thread wherever it's already shown. Inbox and Sent resolve by the canonical system tag's identity, matching feed messages by the ids resolved from the mailbox's tag index rather than a query-level tag filter (which can't see tags on immutable feed messages) or label text, so both actually populate and stay correct across providers/locales. The sync and analyze-topics actions now appear on every one of a mailbox's views (previously only the primary node).

Drafts is now a canonical system-tag view like Inbox/Sent, not a separate data path: a draft is tagged when composed and untagged the instant it sends, so the Drafts view is a plain tag-filtered query over the same aggregate/pagination pipeline as every other view, and a mailbox's in-flight drafts drop out of the "attach to thread" list the moment they're sent rather than waiting on the next sync.
