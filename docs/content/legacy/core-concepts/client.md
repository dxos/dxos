---
title: Client
---

Every DXOS Application starts by creating a Client. 
The `@dxos/client` is your entry point to save and share data with peers in your network.

## Create a Client

The creation and supply is handle by the `ClientInitializer` component exported by `@dxos/react-client`. 
It receives a config object:

```jsx
import { ClientProvider } from '@dxos/react-client';

const config = {
  app: { title: 'My App' },
  storage: { persistent: true },
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' }
};

const App = () => {
  return (
    <ClientProvider config={config}>
      <div>App</div>
    </ClientProvider>
  );
};
```

`ClientInitializer` creates a new `Client` from `@dxos/client` and uses [React Context](https://reactjs.org/docs/context.html) to make the instance accessible anywhere in the app.

### Config

| Property             | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| `app.title`          | Application's title.                                                         |
| `storage.persistent` | If `false` restarts the storage each time you restart the app.               |
| `swarm.signal`       | Signaling server URL. Used to establish WebRTC connections with other peers. |

## Retrieve the Client

Once we have our client built, we will be able to access the instance through the `useClient` hook 
provided by the `@dxos/react-client` package:

```jsx
import { useClient } from '@dxos/react-client';

const Component = () => {
  const client = useClient();

  // ....
};
```

> This hook requires you to wrap your app with `ClientInitializer`. See [Create a Client](#create-a-client) for more details.
