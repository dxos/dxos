---
'@dxos/plugin-inbox': minor
---

Restructure the mailbox nav tree around an inbox-filtered default view, with All Mail, Sent, and Drafts as sibling views rendered through the same list and message companion; drafts now appear inline on their thread wherever it's already shown. Inbox and Sent resolve by the canonical system tag's identity rather than by matching its label text, so they stay correct across providers/locales.
