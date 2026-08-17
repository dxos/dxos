---
'@dxos/plugin-inbox': patch
---

Message summaries now appear as soon as they are derived. A mailbox's annotation feed is provisioned lazily on the first summary, and the article read that reference off the object without subscribing to it, so nothing re-rendered when the feed appeared and the conversation summary stayed missing until the view was reopened.
