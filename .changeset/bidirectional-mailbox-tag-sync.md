---
'@dxos/plugin-inbox': minor
'@dxos/plugin-google': minor
'@dxos/link': minor
'@dxos/pipeline-email': minor
---

Mailbox tags now sync **back** to the provider. Starring a message or archiving it (the `inbox` tag
coming off) reaches Gmail on the next sync, where previously it stayed local and a later sync undid
it.

Reconciliation is a three-way merge whose base is the tag index's Automerge heads — recovered with
`Obj.getVersion` rather than stored as a shadow copy — so no mutation site changes and a crash
re-derives the same diff instead of diverging. `Cursor.spec` gains `tagHeads`, written together with
the delta token through the new `Cursor.writeSyncState`; the two describe the same position, and
advancing one without the other would leave a run diffing a fresh delta against a stale base.

Which tags participate is the provider's label map inverted, so a user tag is never pushed as a new
provider label. Gmail's `SPAM` is now mapped onto the canonical `spam` tag in both directions, so its
spam verdict and `ClassifyMailbox`'s resolve to one tag rather than two parallel notions of junk.
`TRASH` remains unmapped — deletion is not a tag.

`MailSyncProviderService` gains an optional `pushTags`, so a provider with no write path (JMAP today)
degrades to pull-only rather than failing. It reports per-op outcomes: a permanent rejection settles,
since no retry can help and refusing to advance would block the base forever, while a transient one
stays pending and holds the base back so the change is retried on a later run.
