---
order: 2
title: Getting started
next: ./platform
---

# Getting started

DXOS is the developer platform for **collaborative**, **offline-first**, **privacy-preserving** software.

Learn about the [mission](why).

::: note In this guide

*   Starting a react project with an [app template](#create-an-app).
*   Using [ECHO](#echo-state-consensus) for real-time state consensus in `react`.
*   Using [HALO](#how-to-use-echo) for decentralized identity.
*   Starting a [KUBE](#starting-a-kube) to host the app.
*   [Deploying](#deploying-your-app-to-a-kube) the app to KUBE.

:::

## Create an app

DXOS project templates are based on [`vite`](https://vitejs.dev/), [`typescript`](https://www.typescriptlang.org/), [`react`](https://reactjs.org/), [`tailwind`](https://tailwindcss.com/), [`pwa`](https://vite-pwa-org.netlify.app/), and other opinions to get you going quickly.

DXOS works in any Node.js or Browser environment. There is a [TypeScript API](typescript) and a [`react` API](react).

This guide will walk you through creating and deploying a `react` app.

Ensure `node -v` is at version 18 or higher (recommend [Node Version Manager](https://github.com/nvm-sh/nvm)).

First, create a new empty folder

```bash
mkdir hello
cd hello
```

Initialize the app with `npm init` like this:

```bash
npm init @dxos@latest
```

::: note
If you encounter an error with `EINVALIDPACKAGENAME` it's likely the npm/node versions are out of date. Ensure `node -v` is 18 or higher and `npm -v` is 9 or higher.
:::

Then, use your favorite package manager such as `yarn`, `npm` or `pnpm`:

```bash
pnpm install
pnpm serve
```

This will start the development server and print its URL 🚀.

Now it should be possible to open two windows to that URL and see reactive updates like in the video below.

<video class="dark" controls loop autoplay style="width:100%" src="/images/hello-dark.mp4"></video> <video class="light" controls loop autoplay style="width:100%" src="/images/hello-light.mp4"></video>

::: info Why this is cool:

*   State is being reactively shared between all instances of the app running on the same device. If more peers join the space, all of them will see updates reactively.
*   Data is stored **locally**, in-browser, in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), controlled by the `halo.dxos.org` domain. **This enables privacy and gives end-users control over their data**. The app running on `localhost` subscribes to data through a local shared memory connection with the [HALO](./platform/halo) [PWA](./glossary#pwa) on `halo.dxos.org` which is fast and works offline. Learn more about the [HALO vault topology](./platform/#local-vault-topology).
*   When remote peers join the same [space](./platform/#spaces), their changes are given to running apps through [HALO](./platform/halo) in the same way.
*   Remote peers exchange data directly, **peer-to-peer** over secure [WebRTC](https://webrtc.org/) connections.
*   User identity (public/private keys) are established securely and maintained by [HALO](./platform/halo) for the whole device (browser profile), without a password.
*   Everything works offline.
*   Real-time collaboration is possible when online.
*   There are **no servers** that store any data.
*   There is no need for [ORMs](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping). ECHO objects are "plain javascript" objects that can be manipulated directly.
*   There is no need for an API tier. The app has everything it needs on the client.

:::

## ECHO State Consensus

[ECHO](./#echo) is a peer-to-peer graph database designed for offline-first and real-time collaboration. There is no central server, peers exchange data directly over p2p connections.

### How to use ECHO

1.  Install `@dxos/client` or `@dxos/react-client` for `react` using `npm`, `yarn`, or `pnpm`.
2.  Create and initialize a [Client](typescript) or use a [`<ClientProvider />`](react) in `react`.
3.  Establish a HALO [identity](platform/halo).
4.  Create or join a [space](platform/#spaces).
5.  Find objects with [`query`](typescript/queries) or [`useQuery`](react/queries) in `react`.
6.  Mutate the objects as you would plain JavaScript objects, and they will replicate with other peers for you. 🚀

```tsx file=./react/snippets/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useIdentity,
  useQuery,
  useSpaces
} from '@dxos/react-client';

const Component = () => {
  // Get the user to log in before a space can be obtained.
  const identity = useIdentity();
  // Get the first available space, created with the identity.
  const [space] = useSpaces();
  // Grab everything in the space.
  const objects = useQuery(space, {});
  // Show the id of the first object returned.
  return <>{objects[0]?.id}</>;
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

### Mutations

Any objects coming from [`query`](typescript/queries) or [`useQuery`](react/queries) are **tracked**. Manipulate them directly:

```tsx{13-15} file=./snippets/react-mutate.tsx#L5-
import React from 'react';
import { useQuery, useSpace } from '@dxos/react-client';

// ensure there is a ClientProvider somewhere in the tree above
export const Component = () => {
  const space = useSpace('<space-key>');
  const objects = useQuery(space, {});

  return (
    <div
      onClick={() => {
        // mutate objects directly and they will be replicated to all peers
        const object = objects[0];
        object.counter = 0;
        object.name = 'example';
      }}
    ></div>
  );
};
```

The above writes will start propagating to connected peers in the space on the next tick.

The changes will also cause any subscribed UI components in the app to re-render accordingly as well.

Creating new objects:

```tsx{12,13,16} file=./snippets/react-create.tsx#L5-
import React from 'react';
import { useQuery, useSpace } from '@dxos/react-client';
import { Expando } from '@dxos/react-client';

// ensure there is a ClientProvider somewhere in the tree above
export const Component = () => {
  const space = useSpace('<space-key>');
  return (
    <div
      onClick={() => {
        // create an Expando object for storing arbitrary JavaScript objects
        const note = new Expando({ title: 'example' });
        note.description = 'Expandos can have any additional properties.';
        // call this once per object
        // subsequent mutations will be replicated to all peers
        space!.db.add(note);
      }}
    ></div>
  );
};
```

This will begin tracking further changes on the object and replicating them to other peers.

### Recap

*   A [HALO identity](./platform/halo) and a [space](./platform/#spaces) are required to use ECHO.
*   Reading objects is as simple as [`space.query()`](typescript/queries) in TypeScript or [`useQuery()`](react/queries) in `react`.
*   The objects returned are tracked by the `Client` and direct mutations to them will be synchronized with other peers (and other parts of your app) reactively.

### Next steps

Continue reading below about how to deploy and host the app, or jump to:

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

Once KUBE is running, applications can be deployed to it. 🚀

Learn more about what [services](platform/kube) KUBE provides.

## Deploying apps to KUBE

To deploy to KUBE, first ensure a [KUBE](#starting-a-kube) is running as above.

If using a [DXOS application template](#create-an-app):

```bash
pnpm run deploy
```

Otherwise, to deploy any static application:

*   Ensure the [`dx` CLI](#creating-apps-with-dx-cli) is installed
*   Ensure there is a [`dx.yml`](kube/dx-yml-file) file in the project root
*   Run `dx app publish`

The app will be accessible in a browser at `http://<app-name>.localhost` where `<app-name>` is found in `dx.yml`. 🚀

For example, and app created with `dx app create hello`, the app will be on [`hello.localhost`](http://hello.localhost) by default.

::: warning Caution
Your app will now always be available on your machine until KUBE or the specific app is stopped.
:::

### Tunneling

KUBE can expose apps to the world wide web and provide URLs that can be used to reach them from anywhere on the internet.

Simply set `tunnel: true` in `dx.yml` and redeploy. Read more about KUBE [`tunneling`](./kube/tunneling).

## Next steps

This guide demonstrated how to create and deploy a local-first DXOS application.

Using DXOS:

*   ECHO with [React](./react/)
*   ECHO with [TypeScript](./typescript/)
*   ECHO with [strongly typed objects](./typescript/queries#typed-queries)

We hope you'll find the technology useful, and we welcome your ideas and contributions:

*   Join the DXOS [Discord](https://discord.gg/KsDBXuUxvD)
*   DXOS [repository on GitHub](https://github.com/dxos/dxos)
*   File a bug or idea in [Issues](https://github.com/dxos/dxos/issues)

Happy building! 🚀
