---
order: 1
title: Quick start
next: how-it-works
prev: why
---

# Quick start

DXOS is the developer platform for **collaborative**, **offline-first**, **privacy-preserving** software.<br/> Learn more about our [mission](why).

In this guide:

- [Templates](#creating-apps-with-dx-cli) for creating local-first apps
- [Using an ECHO database](#using-the-echo-database) for real-time, offline-first consensus
- [Installing KUBE infrastructure](#starting-a-kube) for hosting apps locally
- [Deploying apps to KUBE](#deploying-your-app-to-a-kube)

## Creating apps with `dx` CLI

The `dx` cli offers a production-ready application template based on `vite` with `typescript`, `react`, `pwa`, and other opinions built in.

Install:

```bash
pnpm i -g @dxos/cli
```

:::note
Only [`pnpm`](https://pnpm.io/) is supported for now, temporarily (`npm i -g pnpm`).
:::

Now you can use the `dx` command line tool:

```bash
dx app create hello # or with --template=bare
cd hello
pnpm serve
```

This will start the development server.

## Using the ECHO database

[ECHO](overview#echo) is a peer-to-peer graph database designed for offline-first and real-time collaboration. There is no central server, peers exchange data directly over p2p connections.

Install:

```bash
pnpm i @dxos/client
```

To use ECHO, start with an instance of the [`Client`](echo/configuration).

Before storing data, your client needs to create or join a [space](echo/spaces).

```ts file=./echo/snippets/create-space.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

const space = await client.echo.createSpace();
```

Now you can manipulate items in the space and they will replicate with all members of the space in a peer-to-peer fashion.

```ts file=./echo/snippets/write-items.ts#L9-
// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

// create a regular ObjectModel item
const item = await spaces[0].database.createItem({
  type,
  model: ObjectModel
});

// set a property value
item.model.set('someKey', 'someValue');

// query items
const items = spaces[0].database.select({ type });
```

### React usage

Use `ClientProvider` and `useClient` with React:

```tsx file=./echo/snippets/create-client-react.tsx#L5-
import React, { createRoot } from 'react';
import { ClientProvider, useClient } from '@dxos/react-client';

const App = () => {
  const client = useClient();
  return <pre>{JSON.stringify(client.toJSON(), null, 2)}</pre>;
};

createRoot(document.body).render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

Read more:

- [ECHO configuration](echo/configuration)
- [ECHO with React](echo/react)
- [Client](../api/@dxos/client/classes/Client.md) API Documentation

## Starting a KUBE

[KUBE](/docs/kube/overview) hosts and serves applications and provides supporting services like peer network discovery.

Install KUBE:
```bash file=./snippets/install-kube.sh
sudo ch=dev bash -c "$(curl -fsSL https://install-kube.dxos.org)"
```

Then:

```bash
sudo kube start # start the service in the background
kube status # verify it's running
```

Once KUBE is running, you're ready to deploy to it.

## Deploying your app to a KUBE

To deploy to your local kube:

- Ensure a [KUBE](#starting-a-kube) is running
- Ensure the [`dx` CLI](#creating-apps-with-dx-cli) is installed
- Ensure there is a [`dx.yml`](kube/dx-yml-file) file in the project root

If you're using the DXOS application template:
```bash
pnpm run deploy
```
To deploy any static app with a `dx.yml` file:
```bash
dx app publish
```

Your app will now be accessible in a browser `http://<app-name>.localhost`.

If you started with `dx app create hello`, the app will be on [`hello.localhost`](http://hello.localhost).

Your app will now always run on your machine until stopped.

:::note
Coming soon:
- `tunneling`: ability to expose apps on your KUBE to the public internet
- `console`: a management console for the apps running on your KUBE
:::

Read more:

- The [`dx.yml` file schema](kube/dx-yml-file). One is provided for you if you're using a DXOS [template](cli/templates) or [sample](samples).
