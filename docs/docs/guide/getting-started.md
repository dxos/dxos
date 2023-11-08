---
order: 2
title: Quick Start
next: ./tutorial
---

# Quick Start Guide

DXOS is the developer platform for **collaborative**, **offline-first**, **privacy-preserving** software.
This guide shows how to use [ECHO](./platform/) for state consensus and [HALO](./platform/halo) for decentralized identity.

DXOS works in any Node.js or Browser environment. There is a [TypeScript API](typescript) and a [`react` API](react).

::: note In this guide

*   [Installation and usage](#installation).
*   Using with [React](#react).
*   Project [templates](#project-templates).
*   [Deploy](#deployment) to Netlify.

:::

## Installation and usage

For any `node` or browser build such as `vite`, or `rollup` (for `react` see [below](#react)):

```bash
npm install --save @dxos/client
```

Create and initialize a [`Client`](/api/@dxos/client/classes/Client):

```ts file=./typescript/snippets/create-client.ts#L5-
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

## Usage with React

Use `@dxos/react-client` for `react` hooks to access and manipulate data in ECHO and HALO.

```bash
npm install --save @dxos/react-client
```

Create a `ClientProvider` to wrap your application. This allows nested components to use the hooks.

```tsx file=./react/snippets/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

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
*   Data is stored **locally**, in-browser, in [OPFS](https://fs.spec.whatwg.org/#origin-private-file-system) or [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), controlled by the `halo.dxos.org` domain. **This enables privacy and gives end-users control over their data**. The app running on `localhost` subscribes to data through a local shared memory connection with the [HALO](./platform/halo) [PWA](./glossary#pwa) on `halo.dxos.org` which is fast and works offline. Learn more about the [HALO vault topology](./platform/#local-vault-topology).
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

The build command is `npm run build` which produces a static bundle in the output folder `out/<app-name>`, which can be changed in `vite.config.ts`.

For example, with [Netlify](https://netlify.com):

1.  Go to "Add new site", and click "Import an existing project."
2.  Link to your application's repository.
3.  Set the build command and output directory.
4.  Publish!

If you would like to host the application yourself, see our guide on [using KUBE for self-sovereign hosting](./kube/deploying.md).

## Next steps

*   Step-by-step [React tutorial](./tutorial.md)
*   ECHO with [React](./react/)
*   ECHO with [TypeScript](./typescript/)
*   ECHO with [strongly typed objects](./typescript/queries#typed-queries)

We hope you'll find the technology useful, and we welcome your ideas and contributions:

*   Join the DXOS [Discord](https://discord.gg/KsDBXuUxvD)
*   DXOS [repository on GitHub](https://github.com/dxos/dxos)
*   File a bug or idea in [Issues](https://github.com/dxos/dxos/issues)

Happy building! 🚀
