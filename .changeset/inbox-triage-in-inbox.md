---
'@dxos/plugin-inbox': minor
'@dxos/plugin-assistant': minor
---

Inbox triage moves into `@dxos/plugin-inbox` as `InboxOperation.TriageMailbox`, offered as **Triage inbox** in the mailbox menu, so labelling, priority and task extraction no longer need a separate plugin. Triage now extracts tasks from messages whose contacts or summaries were already extracted on sync; only a recorded task marks a message as done. `@dxos/plugin-assistant` serves Cloudflare's keyless models (Clef, Clef Flash and jev on Workers AI, the default decision model, and Clairic) through EDGE by default, so a signed-in user can triage without enabling the TypeSafe plugin, whose settings still take precedence when it is enabled.
