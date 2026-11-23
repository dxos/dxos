---
title: Configuration
description: Every client setting that points at or turns on part of EDGE.
---

This page lists every client setting that points at EDGE or turns on part of it. The settings go in the client's
`Config`, as in [Installation](/docs/echo/learn/installation/):

```ts
const config = new Config({
  runtime: {
    client: {
      edgeFeatures: {
        signaling: true,
        subductionReplicator: true,
        feedReplicator: true,
      },
    },
    services: {
      edge: { url: 'https://dxos.network/' },
      iceProviders: [{ urls: 'https://dxos.network/ice' }],
    },
  },
});
```

| Setting                                            | Type             | Default in a bare `Config` | Effect                                                                           |
| -------------------------------------------------- | ---------------- | -------------------------- | -------------------------------------------------------------------------------- |
| `runtime.services.edge.url`                        | URL              | none                       | Sets the EDGE environment the client uses. Without it, the client never connects |
| `runtime.services.iceProviders`                    | `{ urls }[]`     | none                       | Lists URLs that return ICE servers for WebRTC                                    |
| `runtime.services.ice`                             | `RTCIceServer[]` | none                       | Gives WebRTC a fixed list of ICE servers                                         |
| `runtime.client.edgeFeatures.signaling`            | `boolean`        | off                        | Uses EDGE as the [signaling server](/docs/mesh/concepts/signaling/)              |
| `runtime.client.edgeFeatures.subductionReplicator` | `boolean`        | off                        | Replicates Automerge documents with EDGE                                         |
| `runtime.client.edgeFeatures.feedReplicator`       | `boolean`        | off                        | Replicates feeds with EDGE                                                       |
| `runtime.client.edgeFeatures.agents`               | `boolean`        | off                        | Turns on the identity's agent device, whose key EDGE holds                       |

Composer and the `dx` CLI turn on all four `edgeFeatures` flags.

The agent device is a device of the identity that EDGE holds a key for. It is not a SAGE agent. See
[Identity services](/docs/edge/concepts/identity-services/).

## Environments

| `edge.url`                      | Environment |
| ------------------------------- | ----------- |
| `https://dxos.network/`         | Production  |
| `https://preview.dxos.network/` | Preview     |
| `https://dev.dxos.network/`     | Dev         |
