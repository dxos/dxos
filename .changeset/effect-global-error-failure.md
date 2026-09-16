---
'@dxos/protocols': patch
---

Effect failure channels carry tagged errors rather than the global `Error`, so callers can discriminate a failure by its type instead of matching on message text.
