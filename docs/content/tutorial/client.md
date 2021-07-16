---
title: 1. Set Up a DXOS Client
description: Create a Client and connect a React application.
---

Every DXOS Application starts by creating a Client. The `@dxos/client` is your entry point to save and share data with peers in your network.

## Create a Client

Take a look at the component `src/App.js`, the root component of the application.

The first component being rendered is `ClientInitializer` from `@dxos/react-client`.

```js
import React from 'react';
import { ClientInitializer } from '@dxos/react-client';

import { initConfig } from './config';

const App = () => {
  return <ClientInitializer config={initConfig}></ClientInitializer>;
};
```

This `ClientInitializer` is a React component that facilitates the process of initializing and providing a client instance, given a config object or generator function.

It creates a new `Client` instance and uses the [React Context](https://reactjs.org/docs/context.html) feature to make the instance accessible anywhere in the app.

An example config object looks like:

```js
const config = {
  storage: { persistent: true },
  wns: {
    server: 'https://wns1.kube.moon.dxos.network/api',
    chainId: 'devnet-2',
  },
  swarm: { signal: 'wss://apollo1.kube.moon.dxos.network/dxos/signal' },
};
```

Short explanation of parameters:

- `storage` - storage for feeds and keyring
- `wns` - connection to WNS registry
- `swarm.signal` - signaling server URL. Used to establish WebRTC connections with other peers.

## Retrieve the Client Instance

Once we have our client constructed using ClientInitializer, we will be able to access the client instance through the `useClient` custom hook provided by the `@dxos/react-client` package. Take a look at src/components/Root.js and you will find:

```js
import React from 'react';
import { useClient } from '@dxos/react-client';

import Main from './Main';

const Root = () => {
  const client = useClient();

  return <Main />;
};

export default Root;
```
