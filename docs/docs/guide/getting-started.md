---
order: 2
title: Quick start
next: ./tutorial
---

# Quick start

DXOS is the developer platform for **collaborative**, **offline-first**, **privacy-preserving** software. This guide shows how to use [ECHO](./platform/) for state consensus and [HALO](./platform/halo) for decentralized identity.

DXOS works in any Node.js or Browser environment. There is a [TypeScript API](typescript) and a [`react` API](react).

::: note In this guide

*   [Installation](#installation)
*   Using with [React](#react)
*   Project [templates](#project-templates).
*   [Deploy](#deployment) to Netlify
*   Self-sovereign hosting with [KUBE](#self-sovereign-hosting).

:::

## Installation

For any `node` or browser build such as `vite`, or `rollup` (for `react` see [below](#react)):

```bash
npm install --save @dxos/client
```

Create and initialize a [`Client`](/api/@dxos/client/classes/Client):

```ts file=./snippets/create-client.ts#L5-
import { Client } from '@dxos/client';

// create a client
const client = new Client();

const main = async () => {
  await client.initialize();
  // use client here

};

main();
```

An [Options](/api/@dxos/client/types/ClientOptions) object can be passed to `Client()`. See [configuration examples](config).

To begin manipulating data, we must [create an identity](./typescript/identity), and [join or create a space](./typescript/spaces). 

See below for `react` usage, otherwise see the [TypeScript Guide](./typescript/queries).

## React

Use `@dxos/react-client` for `react` hooks to access and manipulate data in ECHO and HALO.

```bash
npm install --save @dxos/react-client
```

Create a `ClientProvider` to wrap your application. This allows nested components to use the hooks.

```tsx file=./snippets/create-client-react.tsx#L5-
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

Components will automatically re-render when the data changes. Change the data by mutating it as any regular JavaScript object.

For a step-by-step walkthrough, see the [react tutorial](./tutorial).

## Project templates

DXOS project templates are based on [`vite`](https://vitejs.dev/), [`typescript`](https://www.typescriptlang.org/), [`react`](https://reactjs.org/), [`tailwind`](https://tailwindcss.com/), [`pwa`](https://vite-pwa-org.netlify.app/), and other opinions to get you going quickly.

Ensure `node -v` is at version 18 or higher (recommend [Node Version Manager](https://github.com/nvm-sh/nvm)).

Initialize an empty folder with `npm create` like this:

```bash
npm create @dxos@latest
```

::: note
If you encounter an error with `EINVALIDPACKAGENAME` it's likely the npm/node versions are out of date. Ensure `node -v` is 18 or higher and `npm -v` is 9 or higher.
:::

Then, use your favorite package manager such as `yarn`, `npm` or `pnpm`:

```bash
npm install
npm run serve
```

This will start the development server and print a URL to the console. Opening two browser windows can demonstrate local state sync working:

<video class="dark" controls loop autoplay style="width:100%" src="/images/hello-dark.mp4"></video> <video class="light" controls loop autoplay style="width:100%" src="/images/hello-light.mp4"></video>

::: info Why this is cool:

*   State is being reactively shared between all instances of the app running on the same device. If more peers join the space, all of them will see updates reactively.
*   Data is stored **locally**, in-browser, in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), controlled by the `halo.dxos.org` domain. **This enables privacy and gives end-users control over their data**. The app running on `localhost` subscribes to data through a local shared memory connection with the [HALO](./platform/halo) [PWA](./glossary#pwa) on `halo.dxos.org` which is fast and works offline. Learn more about the [HALO vault topology](./platform/#local-vault-topology).
*   Remote peers exchange data directly, **peer-to-peer** over secure [WebRTC](https://webrtc.org/) connections.
*   User identity (public/private keys) are established securely and maintained by [HALO](./platform/halo) for the whole device (browser profile), without a password.
*   Everything works offline.
*   Real-time collaboration is possible when online.
*   There are **no servers** that store any data.
*   There is no need for [ORMs](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping). ECHO objects are "plain javascript" objects that can be manipulated directly.
*   **There is no need for an API tier.** The app has everything it needs on the client.

:::

### Deployment

By default DXOS template apps are static, Progressive Web Apps that work offline. They can be deployed with any regular static hosting technique like Netlify, Vercel, CloudFlare, GitHub Pages, an S3 bucket, and others.

The build command is `npm run build` which produces a static bundle in the output folder `out/shared-counter`, which can be changed in `vite.config.ts`.

For example, with [Netlify](https://netlify.com):

<<<<<<< HEAD
- The `<ServiceWorkerToastContainer>` allows the vault to send messages in the form of Toasts to the application.
- `<ErrorBoundary>` and `<ResetDialog>` catch errors that bubble up from the application and provide a user-friendly way to refresh the application in the event of a crash.
- `<ThemeProvider>` and the `<GenericFallback>` give you the DXOS styles along with a loading indicator.

## Creating a User Identity

Before an application can read or write user data, the device must be authenticated. The first time a user runs a DXOS application, they won't have an identity yet. The application needs to prompt them to create one.

Let's create a simple component called `Counter.tsx`.

```tsx
import { useIdentity, useSpaces } from '@dxos/react-client';
import React from 'react';

export const Counter = () => {
  // Get the user to log in before a space can be obtained.
  const identity = useIdentity();
  // Get the first available space, created with the identity.
  const [space] = useSpaces();
  return <></>;
};
```

`useIdentity` attempts to use the device's existing identity, if there is one. If the device's vault has no identity, the user will be [prompted](./platform/halo.md#establishing-user-identity) to create a new one or link to an existing authed device.

`useSpaces` returns all the user's spaces. An [ECHO Space](./platform/README.md#spaces) is an instance of an ECHO database that will be replicated to peers that connect to the space. Spaces can be created and joined programmatically, but in this case a space was created automatically when `useIdentity` created a new identity. For now, we'll just grab that first auto-created space.

## Updating UI state from ECHO

Now that the user has an identity and an ECHO database, let's update the UI to reflect the contents of the database. In the `Counter` component, replace the `return` with the following:

```tsx
const [counter] = useQuery(space, { type: 'counter' });

return (
  <div>
    {counter ? (
      <div className="text-center">
        Clicked {counter.values ? counter.values.length : '0'} times.
      </div>
    ) : (
      <div className="text-center">No counter created.</div>
    )}
  </div>
);
```

(Make sure you add the import for `useQuery`.)

`useQuery` allows you to search the database for objects that match the query. In our case, we are searching for objects that have a key and value of `type: 'counter'`. The first time this query executes, there is no object that matches it.

We need an empty counter that we can increment. Above the `return` statement, add the following lines:

```tsx
if (space && !counter) {
  const c = new Expando({ type: 'counter', values: [] });
  space.db.add(c);
}
```

(Make sure you add the import for `Expando`.)

When the app refreshes, you should now see "Clicked 0 times."

### Expando for Untyped Data

`Expando` is a DXOS wrapper class for storing [untyped data](./react/mutations.md#untyped-mutations) in ECHO. An `Expando` is just a plain ol' JavaScript object that you can add fields to and manipulate directly. We also offer robust tooling around [typed data](./react/mutations.md#typed-mutations) that we recommend for more complex applications.

## Updating the Counter

Let's add a button to update the count of the counter.

At this point, your `Counter` component should look like this, with a `<button>` added for incrementing the count:

```tsx{18-25}
import { Expando, useIdentity, useQuery, useSpaces } from "@dxos/react-client";
import React from "react";

export const Counter = () => {
  const identity = useIdentity();
  const [space] = useSpaces();
  const [counter] = useQuery(space, { type: "counter" });

  if (space && !counter) {
    const c = new Expando({ type: "counter", values: [] });
    space.db.add(c);
  }

  return (
    <div>
      {counter ? (
        <div className="text-center">
          <button
            className="border bg-white dark:bg:black py-2 px-4 rounded"
            onClick={() => {
              counter.values.push(1);
            }}
          >
            Click me
          </button>
          <p>Clicked {counter.values ? counter.values.length : "0"} times.</p>
        </div>
      ) : (
        <div className="text-center">No counter created.</div>
      )}
    </div>
  );
};
```

Every time you click the button, you should see the count increase by 1. Notice how we updated the `counter`'s value: we simply pushed elements onto the array directly. We instantiated the `counter` variable from `useQuery`, so it's value is tracked: changes to it's value are automatically persisted to ECHO and reactively update the UI.

### Local-first

The counter's data is stored locally, in-browser, in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) which works offline. Try it out. Refresh the app. Quit your browser and re-open it. The counter's count remains. You can even update the count offline.

## Connecting another peer

Now let's test out connecting multiple peers. Open another window and load the localhost URL. The two windows should now be in sync. You can also connect a peer on a different device.

### Peer-to-peer over WebRTC

What's going on behind the scenes? The two peers are communicating directly, peer-to-peer, over secure WebRTC connections.

### CRDTs for Consistency

You may wonder why we chose to represent a counter as an array when an integer would work just as well.

- Because CRDTs
  - LWW could screw this up.

<<<<<<< HEAD
::: info Why this is cool:

- State is being reactively shared between all instances of the app running on the same device. If more peers join the space, all of them will see updates reactively.
- Data is stored **locally**, in-browser, in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), controlled by the `halo.dxos.org` domain. **This enables privacy and gives end-users control over their data**. The app running on `localhost` subscribes to data through a local shared memory connection with the [HALO](./platform/halo) [PWA](./glossary#pwa) on `halo.dxos.org` which is fast and works offline. Learn more about the [HALO vault topology](./platform/#local-vault-topology).
- When remote peers join the same [space](./platform/#spaces), their changes are given to running apps through [HALO](./platform/halo) in the same way.
- Remote peers exchange data directly, **peer-to-peer** over secure [WebRTC](https://webrtc.org/) connections.
- User identity (public/private keys) are established securely and maintained by [HALO](./platform/halo) for the whole device (browser profile), without a password.
- Everything works offline.
- Real-time collaboration is possible when online.
- There are **no servers** that store any data.
- There is no need for [ORMs](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping). ECHO objects are "plain javascript" objects that can be manipulated directly.
- There is no need for an API tier. The app has everything it needs on the client.

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

=======
>>>>>>> 8eab9b46d (Add static deployment guide)
### Recap

- A [HALO identity](./platform/halo) and a [space](./platform/#spaces) are required to use ECHO.
- Reading objects is as simple as [`space.query()`](typescript/queries) in TypeScript or [`useQuery()`](react/queries) in `react`.
- The objects returned are tracked by the `Client` and direct mutations to them will be synchronized with other peers (and other parts of your app) reactively.

## Deploying the app

DXOS apps are static apps that rely on peer-to-peer networking and client-side resources for storage and computation. There are no servers or backends. However, the static assets for the app need to be hosted somewhere in order to access them from a web browser.

We offer a sophisticated self-hosting appliance called [KUBE](./kube/README.md) that you can also use to [deploy your app's assets to IPFS](./kube/deploying.md). While this process is not as simple as a plain static asset host, it avoids reliance on centralized hosts.

For the sake of speed and this guide, we will deploy the app's static assets to Netlify. These instructions should be easy to cross-apply to any hosting provider, including Vercel, GitHub Pages, Cloudflare, etc.

1. Go to "Add new site" in Netlify, and click "Import an existing project."
=======
1. Go to "Add new site", and click "Import an existing project."
>>>>>>> db633aa0e (move new content into tutorial, restore and simplify getting started)
2. Link to your application's repository.
3. Set the build command and output directory.
3. Publish!

## Self-sovereign Hosting

[KUBE](platform/kube) is a compact binary that can host static applications and provides supporting services like peer network discovery for ECHO apps. 

KUBE has everything you need to host apps on your LAN, and can even expose them to the public internet safely with automatic [tunneling](./kube/tunneling).

Install KUBE:

```bash file=./snippets/install-kube.sh
sudo bash -c "$(curl -fsSL https://install-kube.dxos.org)"
```

Then:

```bash
sudo kube start # start the service in the background
kube status # verify it's running
```

Once KUBE is running, static applications can be deployed to it.

DXOS Template apps are pre-configured to deploy to KUBE in one line:

```bash
npm run deploy
```

The app will be accessible in a browser at `http://<app-name>.localhost` where `<app-name>` is found in `dx.yml`.

Read more about KUBE [tunneling](./kube/tunneling).

## Recap

This guide demonstrated how to create and deploy a local-first DXOS application with ECHO state consensus and HALO identity.

*   A [HALO identity](./platform/halo) and a [space](./platform/#spaces) are required to use ECHO.
*   Reading objects is as simple as [`space.query()`](typescript/queries) in TypeScript or [`useQuery()`](react/queries) in `react`.
*   The objects returned are tracked by the `Client` and direct mutations to them will be synchronized with other peers (and other parts of your app) reactively.

Next steps:

*   ECHO with [React](./react/)
*   ECHO with [TypeScript](./typescript/)
*   ECHO with [strongly typed objects](./typescript/queries#typed-queries)
*   Self-sovereign hosting with [KUBE](./kube/)

We hope you'll find the technology useful, and we welcome your ideas and contributions:

*   Join the DXOS [Discord](https://discord.gg/KsDBXuUxvD)
*   DXOS [repository on GitHub](https://github.com/dxos/dxos)
*   File a bug or idea in [Issues](https://github.com/dxos/dxos/issues)

Happy building! 🚀
