---
'@dxos/extractor': minor
'@dxos/plugin-inbox': minor
---

One identity rule per type, shared by the extractor's create-vs-merge decision and by a new duplicate scan, plus a Duplicates tab on the database type article for reviewing and merging what has already accumulated.

Contact extraction is now an allow-list: a sender earns a Person only when we sent or replied to it, or its domain matches a known Organization, and never when the address or message is automated. Mail sync and Google Contacts sync resolve against one index per space rather than a snapshot each, so concurrent syncs no longer both create the same person.
