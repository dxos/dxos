---
title: 1. Setup a DXOS Client
description: Create a Client and connect a React Application.
---

Every DXOS Application starts by creating a Client. The `@dxos/client` is your entry point to save and share data with other peers in your network.

## Create a Client

Take a look at the component `src/App.js`, the root component of the application.

You will find that the first component being rendered is `ClientInitializer` from `@dxos/react-client`.

```js
import React from 'react';
import { ClientInitializer } from '@dxos/react-client';

import { initConfig } from './config';

const App = () => {
  return <ClientInitializer config={initConfig}></ClientInitializer>;
};
```

This `ClientInitializer` is a React component that facilitates the process of initializing and providing a client instance, given a config object or generator function.

Behind the scenes creates a new `Client` instance and uses [React Context](https://reactjs.org/docs/context.html) feature to make the instance accessible anywhere in the app.

An example config object would look like:

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

## Retrieve the Client instance

Once we have our client constructed and provided thanks to ClientInitializer we will be able to access the client instance through the `useClient` custom hook provided by `@dxos/react-client` package. Take a look at src/components/Root.js and you will find something like:

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
