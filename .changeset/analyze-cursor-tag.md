---
'@dxos/plugin-inbox': patch
---

The analysis cursor is now tagged for its consumer like every other feed cursor. It used to be
identified by carrying no foreign key at all — "the untagged one on this feed is mine" — which is the
absence of an identity rather than an identity, so any later consumer that failed to tag its own
cursor was silently adopted and analysis resumed from that consumer's watermark, skipping everything
below it with no error. A legacy untagged cursor is adopted in place rather than replaced, so
existing mailboxes keep their position instead of re-analyzing the whole feed at one model call per
message.
