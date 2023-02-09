---
order: 2
title: Get started
---

# Get started

DXOS is the developer platform for **collaborative**, **offline-first**, **privacy-preserving** software. Learn about the [mission](why).

::: note In this guide

- Starting a project with an [app template](#create-an-app)
- Using [ECHO](#echo-state-consensus) for real-time state consensus in `react`
- Starting a [KUBE](#starting-a-kube) to host the app
- [Deploying](#deploying-your-app-to-a-kube) the app to KUBE
  :::

## Create an app

DXOS project templates are based on `vite`, `typescript`, `react`, `tailwind`, and other opinions to get you going quickly.

Initialize an empty folder with `npm init` like this:

```bash
npm init @dxos
```

Then:

```bash
pnpm install
pnpm serve
```

::: note
Only [`pnpm`](https://pnpm.io/) is supported for now: `npm i -g pnpm`.
:::

This will start the development server 🚀.

You should be able to open two windows and see reactive updates like in the video below.

<video controls loop autoplay style="width:100%" src="/images/quickstart.mp4"></video>

## ECHO State Consensus

[ECHO](./#echo) is a peer-to-peer graph database designed for offline-first and real-time collaboration. There is no central server, peers exchange data directly over p2p connections.

To use ECHO:

1. Create a [Client](echo/typescript/) using [`<ClientProvider />`](echo/react) in `react`
2. Establish [identity](halo)
3. Create or join a [space](echo/react/spaces)
4. Perform reads and writes

```tsx file=./echo/react/snippets/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useClient,
  useIdentity,
  useOrCreateFirstSpace,
  useQuery,
  id
} from '@dxos/react-client';

const Component = () => {
  // get the user to log in before a space can be obtained
  const identity = useIdentity({ login: true });
  // create or use the first space
  const space = useOrCreateFirstSpace();
  // grab everything in the space
  const objects = useQuery(space, {});
  // show the id of the first object returned
  return <>{objects?.[0]?.[id]}</>;
};

const App = () => (
  <ClientProvider>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);

```

Now you can manipulate [objects](./glossary#object) in the space and they will replicate with all members of the space in a peer-to-peer fashion.

Reading objects is as simple as `space.query()` or `useQuery()` in `react`.

The objects returned are tracked by the `Client` and direct mutations to them will be synchronized with other peers (and other parts of your app) reactively.

Next steps:

- [ECHO configuration](echo/configuration)
- [ECHO with React](echo/react)
- [Client](../api/@dxos/client/classes/Client.md) API Documentation

## Starting a KUBE

[KUBE](kube/overview) hosts and serves applications and provides supporting services like peer network discovery.

Install KUBE:

```bash file=./snippets/install-kube.sh
sudo bash -c "$(curl -fsSL https://install-kube.dxos.org)"
```

Then:

```bash
sudo kube start # start the service in the background
kube status # verify it's running
```

Once KUBE is running, you're ready to deploy to it. 🚀

## Deploying your app to a KUBE

To deploy to your local KUBE:

- Ensure a [KUBE](#starting-a-kube) is running
- Ensure the [`dx` CLI](#creating-apps-with-dx-cli) is installed
- Ensure there is a [`dx.yml`](kube/dx-yml-file) file in the project root

If you're using the DXOS application template (from `dx app create`):

```bash
pnpm run deploy
```

To deploy any static app with a `dx.yml` file:

```bash
dx app publish
```

Your app will now be accessible in a browser `http://<app-name>.localhost`.

If you started with `dx app create hello`, the app will be on [`hello.localhost`](http://hello.localhost).

::: warning
Your app will now always be available on your machine until it or KUBE is stopped.
:::

You can also ask KUBE to expose the app to the world wide web so you can share the URL with friends. Simply set `tunnel: true` in `dx.yml` and redeploy. Read more about KUBE [`tunneling`](./kube/tunneling).

:::note Coming soon
- `console` - a management console for the apps running on your KUBE
  :::

Read more:

- [`dx.yml` file schema](kube/dx-yml-file)
- DXOS [templates](cli/templates) and [samples](samples).
