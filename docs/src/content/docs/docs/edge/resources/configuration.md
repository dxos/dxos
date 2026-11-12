---
title: Configuration
description: Every client setting that points at or turns on part of EDGE.
---

These settings go in the client's `Config`, as in [Installation](/docs/echo/learn/installation/):

```ts
const config = new Config({
  runtime: {
    client: {
      edgeFeatures: { signaling: true, subductionReplicator: true, feedReplicator: true },
    },
    services: {
      edge: { url: 'https://dxos.network/' },
      iceProviders: [{ urls: 'https://dxos.network/ice' }],
    },
  },
});
```

| Setting                                           | Type                  | Default in a bare `Config` | Effect                                                                      |
| ------------------------------------------------- | --------------------- | -------------------------- | --------------------------------------------------------------------------- |
| `runtime.services.edge.url`                       | URL                   | none                       | The EDGE environment the client uses; without it, the client never connects |
| `runtime.services.iceProviders`                   | `{ urls }[]`          | none                       | URLs that return ICE servers for WebRTC                                     |
| `runtime.services.ice`                            | `RTCIceServer[]`      | none                       | A fixed list of ICE servers                                                 |
| `runtime.client.edgeFeatures.signaling`           | boolean               | off                        | EDGE as the [signaling server](/docs/mesh/concepts/signaling/)              |
| `runtime.client.edgeFeatures.subductionReplicator`| boolean               | off                        | Replicate Automerge documents with EDGE                                     |
| `runtime.client.edgeFeatures.feedReplicator`      | boolean               | off                        | Replicate feeds with EDGE                                                   |
| `runtime.client.edgeFeatures.agents`              | boolean               | off                        | Agents that run on EDGE                                                     |

Composer and the `dx` CLI turn on all four `edgeFeatures` flags.

### Environments

| `edge.url`                        | Environment |
| --------------------------------- | ----------- |
| `https://dxos.network/`           | Production  |
| `https://preview.dxos.network/`   | Preview     |
| `https://dev.dxos.network/`       | Dev         |
