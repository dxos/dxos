---
'@dxos/plugin-agent': patch
---

An email channel whose EDGE has no agent mailboxes now reads as unavailable instead of failing every status poll, and its status reads back off rather than call EDGE every few seconds.
