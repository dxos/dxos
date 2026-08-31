---
'@dxos/echo': minor
---

Remove the classical Automerge edge replicator. Subduction is now the only edge transport: `EchoEdgeReplicator`, the `runtime.client.edgeFeatures.echoReplicator` config flag, the `EdgeService.AUTOMERGE_REPLICATOR` service id, and the bundle `import`/`export` HTTP surface (`EdgeHttpClient.importBundle`/`exportBundle`) are gone, along with the `EdgeHttpClient.createSpace` endpoint the replicator backed. A client that set `echoReplicator: true` must set `subductionReplicator: true` instead.
