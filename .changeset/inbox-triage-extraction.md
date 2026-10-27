---
'@dxos/ai': minor
'@dxos/compute': minor
'@dxos/types': minor
'@dxos/plugin-inbox': minor
---

`@dxos/ai` adds `ExtractionModel`, a typed-field extraction service, with Cloudflare's Clairic (`Model.cloudflareClairic`) resolved through `AiService.extractionModel`. Inbox triage now groups the mailbox by priority band, lists extracted tasks under each email, and lets an agent send a reply (`InboxOperation.SendReply`) after the person allows it in the chat. The permission request shows what the call would send: an operation names that input field with `Operation.ConsentPreviewAnnotation`, and `ContentBlock.Request` carries it as an optional `preview`. `TagIndex.taggedIdsAtom` now updates on every write to a tag, not only the first.
