---
title: Setup a DXOS Client
description: Create a Client and Connect a React Application.
---

Every Application starts by creating a Client. The `@dxos/client` is your entry point to save and share data with other peers in your network.

## Create a Client

We will focus on the `tutorial/apps/task-list` first. 

We can now proceed on how to create our Client instance. In `index.js` we added the imports for `@dxos/client` and its dependencies:

```js
import { Client } from '@dxos/client';
import { createStorage } from '@dxos/random-access-multi-storage';
import { Keyring, KeyStore } from '@dxos/credentials';
import { ClientProvider } from '@dxos/react-client';
```

We created the `client` instance as follows. We provided a `storage` and `keyring` instances, and the configuration for the `signal` server:

```js
const client = new Client({
  storage: createStorage('tasks-db'),
  keyring: new Keyring(new KeyStore(leveljs('tasks-keys'))), 
  swarm: {
    signal: 'wss://signal2.dxos.network/dxos/signal'
  }
});
```

We will dive deep into all these configurations later in this tutorial. 

## Connect the React Application

Once we have our client constructed we can connect our React Application using the `ClientProvider` 
from `@dxos/react-client` package. This provider is similar to React's Context.Provider.

We wrapped our Application and other Providers (such as the `ThemeProvider` for `material-ui` components) with the `ClientProvider` and setup the client instance we just created:

```js

ReactDOM.render(
  <ClientProvider client={client}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </ClientProvider>,
  document.querySelector('#root'),
);
```
