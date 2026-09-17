---
'@dxos/feed': patch
---

Feed sync heals a namespace whose server lost acknowledged positions: the positions the server re-issues are adopted, the namespace is replayed and the displaced blocks are pushed again, instead of every push and pull of that namespace failing forever. The first server token a client sees is recorded rather than forcing a full re-sync, a failing pull backs off instead of polling in a tight loop, and `Error` replies carry the request id so a failed request no longer waits out its timeout.
