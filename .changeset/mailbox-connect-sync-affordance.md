---
'@dxos/link': patch
'@dxos/plugin-connector': patch
---

A mailbox or calendar now always offers exactly one of Connect or Sync, and keeps its sync progress across a disconnect. Deleting a connection leaves its bindings dormant — the cursors are kept rather than deleted with it — so the object offers Connect again; re-connecting the same account resumes where it left off, while connecting an account the object does not already sync is refused rather than merged into it. Connect is disabled when no provider is registered for the type, Sync is disabled when a bound object's provider plugin is absent, and a disabled toolbar dropdown no longer opens an empty menu. A toolbar action or dropdown that starts out disabled now re-enables once the state that disabled it clears, instead of staying greyed out for the rest of the session. Message summaries also appear as soon as they are derived: the mailbox's annotation feed is provisioned lazily, and the article did not subscribe to that reference, so the conversation summary stayed missing until the view was reopened.
