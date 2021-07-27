---
title: 1. Set Up a DXOS Client
description: Create a Client and connect a React application.
---

Every DXOS Application starts by creating a Client. The `@dxos/client` is your entry point to save and share data with peers in your network.

## Create a Client

First, we need to prepare the environment settings for our application.

Create a folder `src/config` and add the following files:

- `config.yml`: _special_ file that will be loaded if the `CONFIG_DYNAMIC` property is set to `false`.
  If `CONFIG_DYNAMIC` is set to `true` each app will try to load from an endpoint (using `{publicUrl}/config/config.json`).
  This allows to dynamically inject settings to our applications.

- `defaults.yml`: contains the default values for your app.

- `envs-map.yml`: provides a map between `process.env` vars and the config paths.

You can just place the following on the `defaults.yml` file and leave the other two empty:

```yml:title=defaults.yml
app:
  title: 'Tasks App'
storage:
  persistent: true
swarm:
  signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal'
wns:
  server: 'https://apollo3.kube.moon.dxos.network/dxos/wns/api'
  chainId: 'devnet-2'
```

Once you have your config files created, add a file `src/config.js` and place the following code:

```js:title=src/config.js
import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

const config = async () => new Config(await Dynamics(), Envs(), Defaults());

export const initConfig = () => config().then(({ values }) => values);
```

We are instantiating a `Config` object from `@dxos/config` package. This Config object is in charge of reading the files we created above:

```
Dynamics() -> config.yml
Envs() -> envs-map.yml
Defaults() -> defaults.yml
```

// todo(grazianoramiro): move to a later section

---

Take a look at the component `src/App.js`, the top most component of your application.

Remove everything that's within the render section and place a `ClientInitializer` from `@dxos/react-client`.
We are providing you the necessary config object for you to start the app. We will move this config to another place in a further step.

```jsx:title=src/App.js
import React from 'react';
import { ClientInitializer } from '@dxos/react-client';

const config = {
  app: { title: 'Tasks App' },
  storage: { persistent: true },
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' },
  wns: {
    server: 'https://apollo3.kube.moon.dxos.network/dxos/wns/api',
    chainId: 'devnet-2',
  },
};

const App = () => {
  return <ClientInitializer config={config}></ClientInitializer>;
};

export default App;
```

This `ClientInitializer` is a React component that facilitates the process of initializing and providing a DXOS client instance to the application.

It creates a new `Client` and uses [React Context](https://reactjs.org/docs/context.html) to make the instance accessible anywhere in the app.

Short explanation of parameters:

- `app.title` - application's title to display on the screen
- `storage` - storage for feeds and keyring
- `storage.persistent` - todo(grazianoramiro): fill in definition
- `wns` - connection to WNS registry
- `swarm.signal` - signaling server URL. Used to establish WebRTC connections with other peers.

## Retrieve the Client Instance

Once we have our client built using ClientInitializer, we will be able to access the instance through the `useClient` hook provided by the `@dxos/react-client` package.

Go ahead and create a new `Root` component to see the `useClient` in action:

```jsx:title=src/components/Root.js
import React from 'react';
import { useClient } from '@dxos/react-client';

const Root = () => {
  const client = useClient();

  return JSON.stringify(client.config);
};

export default Root;
```

We are stringifying the `client.config` property, so you see how you will be able to access the config on the `Client` instance.

In your `src/App.js` file, import your Root component and place it within the `ClientInitializer`:

```jsx:title=src/App.js
//...

import Root from './components/Root';

const App = () => {
  return (
    <ClientInitializer config={config}>
      <Root />
    </ClientInitializer>
  );
};
```

Having the app running, take a look at your browser, you should see printed on the screen the information we sent to the client.
