---
'@dxos/echo-host': patch
'@dxos/client-services': patch
---

A space whose automerge root document stalls mid-load (e.g. after a network reconnect during space setup) is now re-driven with a bounded, backing-off retry instead of waiting on a single unbounded `loadDoc` call forever.
