---
'@dxos/ai': minor
'@dxos/plugin-inbox': minor
---

Add `ExtractionModel` to `@dxos/ai`, a typed-field extraction service served by Cloudflare's Clairic (`Model.cloudflareClairic`), and use it with a decision model to triage an inbox in one action: each email gets labels and a priority band, and what it asks for becomes a task filed in a per-mailbox project and shown under the email. An agent assigned such a task replies through `InboxOperation.SendReply` only after the person allows it in the chat, where the request previews the reply (`Operation.ConsentPreviewAnnotation`); delegated agents now start from their tasks' and source objects' URIs, and code mode accepts an object where an operation expects a reference to it. `TagIndex.taggedIdsAtom` now updates on every write to a tag, not only the first.
