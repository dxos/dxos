---
'@dxos/assistant': patch
---

Reloading a conversation's reducer state from a checkpoint this process already took no longer re-reads the head of the trajectory feed to confirm that nothing is new, which saves one feed query per reducer load.
