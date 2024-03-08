---
title: DXOS Client
---

This API reference documents the `Client` class. 
It's the main DXOS client object. Is the entrypoint to ECHO, HALO, DXNS.

## constructor

Returns an uninitialized `Client` instance.

Takes an `options` object as a parameter. Supported fields of this object are described below.

### Example

```jsx
import { Client } from '@dxos/client';

const client = new Client({
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' }
});
```

### Options

| Property             | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| `app.title`          | Application's title.                                                         |
| `storage.persistent` | If `false` restarts the storage each time you restart the app.               |
| `swarm.signal`       | Signaling server URL. Used to establish WebRTC connections with other peers. |

## Properties

| Name          | Description                                         |
| ------------- | --------------------------------------------------- |
| `config`      | Client config.                                      |
| `echo`        | ECHO database.                                      |
| `halo`        | HALO credentials.                                   |
| `registry`    | DXNS registry.                                      |
| `initialized` | Indicates whether the Client is initialized or not. |

## Methods

| Name               | Description                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `initialize`       | Initializes internal resources in an idempotent way. Required before using the Client instance. |
| `destroy`          | Cleanup, release resources.                                                                     |
| `reset`            | Resets and destroys client storage.                                                             |
| `createspace`      | Create a new space.                                                                             |
| `createInvitation` | Creates an invitation to a given space.                                                         |
