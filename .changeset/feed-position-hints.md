---
'@dxos/echo': minor
---

Feed sync learns a server-initiated `FeedAdvanced` position hint, so a remote write reaches the client without waiting for the poll interval. The hint carries no blocks — the client re-pulls through the existing cursor path — so a dropped hint costs latency rather than correctness. Clients announce namespace-wide subscriptions on connect and relax their full poll from 5s to a 30s reconcile only once the server answers the handshake, leaving behaviour against an older EDGE unchanged.
