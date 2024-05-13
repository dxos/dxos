---
order: 10.2
title: React Tutorial
next: ./platform
---

# React tutorial

This tutorial walks you through creating a simple shared counter application in `react` using DXOS to share counter state between peers.

The code completed application can be found [here](https://github.com/dxos/shared-counter) and you can play with the app [here](https://shared-counter.netlify.app/).

::: note In this tutorial, we will:

* Build a `react` app using a [DXOS app template](#create-an-app).
* Use [ECHO](#updating-the-counter) for real-time state consensus.
* Create a decentralized identity with [HALO](#creating-a-user-identity).
* [Deploy](#deploying-the-app) the app to Netlify.

:::

## Creating a DXOS app

DXOS works in any Node.js or Browser environment. There is a [TypeScript API](typescript) and a [`react` API](react).

Ensure `node -v` is at version 18 or higher (we recommend [Node Version Manager](https://github.com/nvm-sh/nvm)).

We have a few [app templates](../tooling/app-templates.md) that are designed to get you going quickly. They are based on [`vite`](https://vitejs.dev/), [`typescript`](https://www.typescriptlang.org/), [`react`](https://reactjs.org/), [`tailwind`](https://tailwindcss.com/), [`pwa`](https://vite-pwa-org.netlify.app/), and other opinions.

For this guide, we're going to start with the [`bare`](../tooling/app-templates.md#bare-template) template and create a simple shared counter. Initialize the app with `npm create`:

```bash
npm create @dxos/bare@latest
```

Running `npm create` will give you different options to customize your app. For this tutorial, default to saying "yes" to all the prompts with the exception of "Include PWA support", to which you should say "no".

::: note
If you encounter an error with `EINVALIDPACKAGENAME` it's likely the npm/node versions are out of date. Ensure `node -v` is 18 or higher and `npm -v` is 9 or higher.
:::

Then, use your favorite package manager such as `yarn`, `npm` or `pnpm`:

```bash
npm install
npm run serve
```

This will start the development server and print its URL to the console.

The bare template is an empty `react` app wrapped in some DXOS goodness. Open the `App.tsx` file and you'll see this:

```tsx
const config = async () => new Config(Local(), Defaults());

const createWorker = () =>
  new SharedWorker(new URL('./shared-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-client-worker',
  });

const Loader = () => (
  <div className='flex bs-[100dvh] justify-center items-center'>
    <Status indeterminate aria-label='Initializing' />
  </div>
);

export const App = () => {
  return (
    <ThemeProvider
      appNs='counter'
      tx={defaultTx}
      resourceExtensions={translations}
      fallback={<Loader />}
    >
      <ErrorBoundary>
        <ClientProvider
          config={config}
          createWorker={createWorker}
          fallback={Loader}
          onInitialized={async (client) => {
            const searchParams = new URLSearchParams(location.search);
            if (
              !client.halo.identity.get() &&
              !searchParams.has('deviceInvitationCode')
            ) {
              await client.halo.createIdentity();
            }
          }}
        >
          <p>Your code goes here</p>
        </ClientProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};
```

There's a lot going on here! Let's walk through it.

### Bootstrap the DXOS Client

DXOS apps enable users to control their data and identity by storing it in [ECHO](./) and [HALO](../halo/). In a browser-based environment like this React app, data is stored in persistent browser storage. ECHO runs inside of a [Shared Worker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker). The `ClientProvider` bootstraps ECHO and HALO, enabling the application to access the user's identity and data.

### React Helpers

The other wrapper components are part of the DXOS [UI system](../dxos-ui/):

* `<ErrorBoundary>` catches errors that bubble up from the application.
* `<ThemeProvider>` enables default DXOS styles and [`tailwindcss`](https://tailwindcss.com).

## Creating a User Identity

Before an application can read or write user data, the device must be authenticated. The first time a user runs a DXOS application, they won't have an identity yet. When `useIdentity` is called, an identity is created if one doesn't exist.

Let's create a simple component called `Counter.tsx`.

```tsx{6,8} file=./tutorial-snippets/counter.tsx#L5-
import React from 'react';
import { useIdentity } from '@dxos/react-client/halo';
import { useSpaces } from '@dxos/react-client/echo';

export const Counter = () => {
  // Get the user to log in before a space can be obtained.
  useIdentity();
  // Get the first available space, created with the identity.
  const [space] = useSpaces();
  return <></>;
};
```

`useIdentity` attempts to use the device's existing identity, if there is one. If the device's vault has no identity, an identity will be created automatically.

`useSpaces` returns all the user's spaces. An [ECHO Space](../echo/#spaces) is an instance of an ECHO database that will be replicated to peers that connect to the space. Spaces can be created and joined programmatically, but in this case a space was created automatically when `useIdentity` created a new identity. For now, we'll just grab that first auto-created space.

Don't forget to import the `Counter` component in `App.tsx` and replace "Your code goes here" with the `Counter` component:

```tsx
import { Counter } from './Counter';

<Counter />;
```

## Updating UI state from ECHO

Now that the user has an identity and an ECHO database, let's update the UI to reflect the contents of the database. Add the `useQuery` hook to your imports:

```tsx file=./tutorial-snippets/counter-1.tsx#L6
import { useSpaces, useQuery } from '@dxos/react-client/echo';
```

In the `Counter` component, replace the `return` with the following:

```tsx file=./tutorial-snippets/counter-1.tsx#L15-
  const [counter] = useQuery(space, { type: 'counter' });

  return (
    <div>
      {counter && (
        <div className='text-center'>
          Clicked {counter.values.length ?? 0} times.
        </div>
      )}
    </div>
  );
};
```

`useQuery` allows you to search the database for objects that match the query. In our case, we are searching for objects that have a key and value of `type: 'counter'`. The first time this query executes, there is no object that matches it.

We need an empty counter that we can increment.

Grab an `Expando`:

```tsx file=./tutorial-snippets/counter-2.tsx#L6
import { Expando, useQuery, useSpaces } from '@dxos/react-client/echo';
```

Above the `return` statement, add the following effect:

```tsx file=./tutorial-snippets/counter-2.tsx#L13-

  useEffect(() => {
    if (space && !counter) {
      const counter = new Expando({ type: 'counter', values: [] });
      space.db.add(counter);
    }
  }, [space, counter]);

  return (
    <div>
      {counter && (
        <div className='text-center'>
          <button
            className='border bg-white py-2 px-4 rounded'
            onClick={() => {
              counter.values.push(1);
            }}
          >
            Click me
          </button>
          <p>Clicked {counter.values.length ?? 0} times.</p>
        </div>
      )}
    </div>
  );
};
```

When the app refreshes, you should now see `Clicked 0 times.`

### Expando for Untyped Data

`Expando` is a DXOS wrapper class for storing [untyped data](./react/mutations.md#untyped-mutations) in ECHO. An `Expando` is just a plain ol' JavaScript object that you can add fields to and manipulate directly. We also offer robust tooling around [typed data](./react/mutations.md#typed-mutations) that we recommend for more complex applications.

## Updating the Counter

Let's add a button to update the count of the counter.

At this point, your `Counter` component should look like this, with a `<button>` added for incrementing the count:

```tsx{21-28} file=./tutorial-snippets/counter-2.tsx#L5-
import React, { useEffect } from 'react';
import { Expando, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

export const Counter = () => {
  useIdentity();
  const [space] = useSpaces();
  const [counter] = useQuery(space, { type: 'counter' });

  useEffect(() => {
    if (space && !counter) {
      const counter = new Expando({ type: 'counter', values: [] });
      space.db.add(counter);
    }
  }, [space, counter]);

  return (
    <div>
      {counter && (
        <div className='text-center'>
          <button
            className='border bg-white py-2 px-4 rounded'
            onClick={() => {
              counter.values.push(1);
            }}
          >
            Click me
          </button>
          <p>Clicked {counter.values.length ?? 0} times.</p>
        </div>
      )}
    </div>
  );
};
```

Every time you click the button, you should see the count increase by 1.

Notice how we updated the `counter`'s value: we simply pushed elements onto the array directly. We instantiated the `counter` variable from `useQuery`, so it's value is tracked: changes to it's value are automatically persisted to ECHO and reactively update the UI.

### Local-first

The counter's data is stored locally, in-browser, in [OPFS](https://fs.spec.whatwg.org/#origin-private-file-system) or [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) which works offline. Try it out. Refresh the app. Quit your browser and re-open it. The counter's count remains. You can even update the count offline.

## Connecting another peer

Now let's test out connecting multiple peers. Open another window and load the localhost URL. The two windows should now be in sync. You can also connect a peer on a different device.

### Peer-to-peer over WebRTC

What's going on behind the scenes? The two peers are communicating directly, peer-to-peer, over secure WebRTC connections. Every time the button is pressed, an element is added to the array and the count increases. No servers are involved in the exchange of state between peers.

### CRDTs for Consistency

You may wonder why we chose to represent a counter as an array when an integer would be simpler. ECHO uses [CRDTs](https://crdt.tech/) to ensure the state remains consistent. If we used an integer to represent the count, the algorithm for updating the state effectively becomes "last write wins" and short-circuits the CRDT. Consider how each client would update the count, assuming it was an integer:

1. Grab the most recent count value.
2. Increment the count value by 1.
3. Save the count value to the shared state.

If both peers click the button at the exact same time, the count *should* increase by 2. But it will increase by 1. Why? Each of them started with the same number and did the same operation of incrementing by 1.

With an array, each time a client pushes an element onto the array, the CRDT algorithm merges those changes together, preserving all elements from all clients.

This is one of the "gotchas" when working with CRDTs. While they ensure that conflicts will be resolved transparently, you have to think carefully about the data types and what happens during conflicted states.

## Recap

* A [HALO identity](../halo/) and a [space](./#spaces) are required to use ECHO.
* Reading objects is as simple as querying for the object using [`useQuery()`](react/queries.md).
* The objects returned are tracked by the `Client` and direct mutations to them will be synchronized with other peers (and other parts of your app) reactively.

## Deploying the app

DXOS apps are static apps that rely on peer-to-peer networking and client-side resources for storage and computation. There are no servers or backends. However, the static assets for the app need to be hosted somewhere in order to access them from a web browser.

For the sake of simplicity, we will deploy the app's static assets to Netlify. These instructions should be easy to cross-apply to any hosting provider, including Vercel, GitHub Pages, Cloudflare, etc.

1. Go to "Add new site" in Netlify, and click "Import an existing project."
2. Link to your application's repository.
   * Set the build command to `npm run build`
   * Set the output directory to `out/shared-counter` (To customize this, change `vite.config.ts`)
3. Publish!

That's it. Your app is now live!

## Next steps

This guide demonstrated how to create and deploy a local-first DXOS application.

For more info on using DXOS, see:

* ECHO with [React](./react/)
* ECHO with [TypeScript](./typescript/)
* ECHO with [strongly typed objects](./typescript/queries.md#typed-queries)

We hope you'll find the technology useful, and we welcome your ideas and contributions:

* Join the DXOS [Discord](https://discord.gg/eXVfryv3sW)
* DXOS [repository on GitHub](https://github.com/dxos/dxos)
* File a bug or idea in [Issues](https://github.com/dxos/dxos/issues)

Happy building! 🚀
