---
'@dxos/types': minor
---

`Repo` now also models repositories hosted by EDGE, marked by an `edge.dxos.network` foreign key (`Repo.EDGE_SOURCE`, `Repo.edgeId`, `Repo.makeEdge`), and `AiContext.boundObjects` reads the objects a conversation currently binds.
