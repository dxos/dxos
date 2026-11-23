---
'@dxos/edge-client': patch
---

When EDGE refuses replication for the connection's identity (for example, an identity with no Hub Account), the EDGE client logs one warning saying so, instead of passing the refusal to replicators. Swarm and signaling on the same connection keep working.
