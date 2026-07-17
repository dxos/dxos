---
'@dxos/plugin-inbox': minor
---

Restructure the mailbox nav tree around an inbox-filtered default view, with All Mail, Sent, and Drafts as sibling views rendered through the same list and message companion; drafts now appear inline on their thread wherever it's already shown. Inbox and Sent resolve by the canonical system tag's identity, matching feed messages by the ids resolved from the mailbox's tag index rather than a query-level tag filter (which can't see tags on immutable feed messages) or label text, so both actually populate and stay correct across providers/locales. The sync and analyze-topics actions now appear on every one of a mailbox's views (previously only the primary node).
