---
'@dxos/plugin-inbox': patch
---

Unsubscribing from a sender now keeps the skip filter on a mailbox that had no filters yet; the first one was silently dropped. plugin-inbox also registers the `Tag` type it creates, so drafting an email works where only its own types are registered, such as an EDGE plugin bundle.
