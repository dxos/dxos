---
order: 2
title: Getting started
---

# Getting started

DXOS is the developer platform for **collaborative**, **offline-first**, **privacy-preserving** software. Learn about the [mission](why).

::: note In this guide

*   Starting a react project with an [app template](#create-an-app),
*   Using [ECHO](#echo-state-consensus) for real-time state consensus in `react`.
*   Using [HALO](#halo-identity) for decentralized identity.
*   Starting a [KUBE](#starting-a-kube) to host the app.
*   [Deploying](#deploying-your-app-to-a-kube) the app to KUBE.

:::

## Create an app

DXOS project templates are based on `vite`, `typescript`, `react`, `tailwind`, and other opinions to get you going quickly.

DXOS works in any Node.js or Browser environment. There is a [TypeScript API](echo/typescript/) and a [`react` API](echo/react/).

This guide will walk you through creating and deploying a `react` app.

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

You should be able to open two windows pointed at the dev server and see reactive updates like in the video below.

<video class="dark" controls loop autoplay style="width:100%" src="/images/hello-dark.mp4"></video> <video class="light" controls loop autoplay style="width:100%" src="/images/hello-light.mp4"></video>

::: info Why this is cool:

*   State is being reactively shared between all instances of the app running on the same machine.
*   Data is stored **locally**, in-browser, in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), controlled by the `halo.dxos.org` domain. **This enables privacy and gives end-users control over their data**. Learn more about the [HALO vault topology](./platform/#local-vault-topology).
*   The app running on `localhost` subscribes to the data through a local shared memory connection with [HALO](./platform/halo) on `halo.dxos.org` which is fast and works offline.
*   When remote peers join the same [space](./glossary#space), their changes are given to running apps through [HALO](./platform/halo) in the same way.
*   Remote peers exchange data directly, **peer-to-peer** over secure [WebRTC](https://webrtc.org/) connections.
*   User identity (and their public/private keys) are established securely and maintained for the whole device (browser profile), without a password.
*   Everything works offline.
*   Real-time collaboration is possible when online.
*   There are **no servers** or [ORMs](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping) to worry about.

:::

Now you have an application that does all the above. It relies on [ECHO](./echo) to perform state consensus and [HALO](./halo) for identity.

## ECHO State Consensus

[ECHO](./#echo) is a peer-to-peer graph database designed for offline-first and real-time collaboration. There is no central server, peers exchange data directly over p2p connections.

### How to use ECHO

1.  Install `@dxos/client` or `@dxos/react-client` for `react`.
2.  Create a [Client](typescript) or use a [`<ClientProvider />`](react) in `react`.
3.  Establish [identity](platform/halo).
4.  Create or join a [space](platform/#spaces).
5.  Find objects with [`useQuery`](react/queries).
6.  Mutate objects as you would plain JavaScript objects.

```tsx file=./react/snippets/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useIdentity,
  useOrCreateFirstSpace,
  useQuery,
} from '@dxos/react-client';

const Component = () => {
  // get the user to log in before a space can be obtained
  const identity = useIdentity({ login: true });
  // create or use the first space
  const space = useOrCreateFirstSpace();
  // grab everything in the space
  const objects = useQuery(space, {});
  // show the id of the first object returned
  return <>{objects?.[0]?.id}</>;
};

const App = () => (
  <ClientProvider>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);
```

::: tip Tip
To see an example without `react` see the [TypeScript Guide](./typescript/)
:::

Now you can manipulate [objects](./glossary#object) in the space directly and they will replicate with all members of the space in a peer-to-peer fashion.

### Mutations

Any objects coming from `useQuery` are **tracked**. Manipulate them directly:

```ts
const objects = useQuery(space, {});

const object = objects[0];
object.counter = 0;
object.name = 'example';
```

The above writes will start propagating to connected peers in the space on the next tick.

The changes will also cause any subscribed UI components in the app to re-render accordingly as well.

Creating new objects:

```ts
import { Document } from '@dxos/react-client';

const newThing = new Document();
newThing.someProperty = 'example';

space.experimental.db.save(newThing);
```

This will begin tracking further changes on the object and replicating them to other peers.

### Recap

*   Reading objects is as simple as `space.query()` in TypeScript or `useQuery()` in `react`.
*   The objects returned are tracked by the `Client` and direct mutations to them will be synchronized with other peers (and other parts of your app) reactively.

### Next steps

*   ECHO with [React](./react)
*   ECHO with [TypeScript](./typescript)
*   ECHO with [strongly typed objects](./typescript/queries#typed-queries)

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

Learn more about what [services](kube/README#kube-overview) KUBE runs.

## Deploying your app to a KUBE

To deploy to your local KUBE:

*   Ensure a [KUBE](#starting-a-kube) is running
*   Ensure the [`dx` CLI](#creating-apps-with-dx-cli) is installed
*   Ensure there is a [`dx.yml`](kube/dx-yml-file) file in the project root

If you're using a DXOS application template (from `dx app create` or `npm init @dxos/*`):

```bash
pnpm run deploy
```

To deploy any static app with a `dx.yml` file:

```bash
dx app publish
```

Your app will now be accessible in a browser at `http://<app-name>.localhost` where `<app-name>` is found in `dx.yml`. 🚀

If you started with `dx app create hello`, the app will be on [`hello.localhost`](http://hello.localhost).

::: warning Caution
Your app will now always be available on your machine until KUBE or the specific app is stopped.
:::

### Tunneling

You can also ask KUBE to expose the app to the world wide web so you can share the URL with friends. Simply set `tunnel: true` in `dx.yml` and redeploy. Read more about KUBE [`tunneling`](./kube/tunneling).

## Next steps

In this guide we built a local-first, collaborative app using the ECHO database and HALO identity. We deployed it to a KUBE on the local network and exposed the app to the external web with tunneling.

We hope you'll find the technology useful, and welcome your contributions. Happy building! 🚀

Using DXOS:

*   ECHO with [React](./react/)
*   ECHO with [TypeScript](./typescript/)
*   ECHO with [strongly typed objects](./typescript/queries#typed-queries)

Get in touch and contribute:

*   DXOS [repository on GitHub](https:/github.com/dxos/dxos)
*   File a bug or idea in [Issues](https:/github.com/dxos/dxos/issues)
*   Join the DXOS [Discord](https://discord.gg/KsDBXuUxvD)
