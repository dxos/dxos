---
title: Creating the Client
sidebar_title: 1. Creating the Client
description: Configuring and initializing the applications
---

Every DXOS Application starts by creating a Client. The `@dxos/client` is your entry point to save and share data with peers in your network.

## Create the Client

Take a look at the component `src/App.js`, the top most component of your application.

Remove everything that's within the render section and place a `ClientInitializer` from `@dxos/react-client`.
We are providing you the necessary config object for you to start the app. We will move this config to its corresponding place in a further step.

```jsx:title=src/App.js
import { ClientInitializer } from '@dxos/react-client';

const config = {
  app: { title: 'Tasks App' },
  storage: { persistent: true },
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' }
};

const App = () => {
  return (
    <ClientInitializer config={config}>
      <h1>DXOS</h1>
    </ClientInitializer>
  );
};

export default App;
```

This `ClientInitializer` is a React component that facilitates the process of initializing and providing a DXOS client instance to the application.

It creates a new `Client` from `@dxos/client` and uses [React Context](https://reactjs.org/docs/context.html) to make the instance accessible anywhere in the app.


## Retrieve the Client Instance

Once we have our client built, we will be able to access the instance through the `useClient` hook provided by the `@dxos/react-client` package.

Go ahead and create a new `Root` component to see `useClient` in action:

```jsx:title=src/components/Root.js
import { useClient } from '@dxos/react-client';

const Root = () => {
  const client = useClient();
  return JSON.stringify(client.config);
};

export default Root;
```

We are stringifying the `client.config` property, so you see how you will be able to access the config from the `Client` instance.

In your `src/App.js` file, import your Root component and render it within the `ClientInitializer`.

Having the app running, take a look at your browser and you should see printed on the screen the information we had sent to the client.
