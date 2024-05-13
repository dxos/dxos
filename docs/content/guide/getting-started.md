---
order: 3
next: ./tutorial
---

# Quick Start

DXOS is the developer platform for **collaborative**, **offline-first**, **privacy-preserving** software.
This guide shows how to use [ECHO](./echo/) for state consensus and [HALO](./halo/) for decentralized identity.

DXOS works in any Node.js or Browser environment. There is a [TypeScript API](typescript) and a [`react` API](react).

::: note In this guide

* Using with [TypeScript](#usage-with-typescript).
* Using with [React](#usage-with-react).
* Project [templates](#project-templates).
* [Deploy](#deployment) to Netlify.

:::

## Usage with TypeScript

DXOS can be used in both the `node` and browser environments.

If you're using a browser environment, ensure you've set up your bundler to handle `wasm`. Example [vite config](#usage-in-a-browser) and [project templates](#project-templates).

```bash
npm install --save @dxos/client
```

Create and initialize a [`Client`](/api/@dxos/client/classes/Client):

```ts file=./snippets-typescript/create-client.ts#L5-
import { Client } from '@dxos/client';

// create a client
const client = new Client();

const main = async () => {
  await client.initialize();
  // use client here

};

main();
```

An [Options](/api/@dxos/client/types/ClientOptions) object can be passed to `Client()`. See [configuration examples](echo/typescript/config.md).

[Spaces](./echo/#spaces) are the main units of data storage and sharing (like `collections` in other databases).

To begin manipulating data, use `client.spaces.default`, or [join or create a space](./echo/typescript/README.md).

See below for `react` usage, otherwise see the [TypeScript Guide](./echo/typescript/queries.md).

## Usage with React

Use `@dxos/react-client` for `react` hooks to access and manipulate data in ECHO and HALO.

```bash
npm install --save @dxos/react-client
```

Create a `ClientProvider` to wrap your application. This allows nested components to use the hooks.

```tsx file=./snippets-react/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

const createWorker = () =>
  new SharedWorker(new URL('../shared-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-client-worker',
  });

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
  <ClientProvider createWorker={createWorker}>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);
```

The [`SharedWorker`](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) allows resources to be shared between tabs and windows. Put the following in a file called `shared-worker.ts` in the same directory as your `App` component above:

```tsx file=./snippets-react/shared-worker.ts#L5-
onconnect = async (event) => {
  const { onconnect } = await import('@dxos/react-client/worker');
  await onconnect(event);
};
```

Components will automatically re-render when the data changes. Change the data by mutating it as any regular JavaScript object.

For a step-by-step walkthrough, see the [react tutorial](./echo/tutorial.md).

## Usage in a browser

DXOS recommends [Vite](https://vitejs.dev/) as the bundler. Vite requires a plugin in order to serve the WebAssembly modules.

```bash
npm install --save vite-plugin-top-level-await vite-plugin-wasm
```

Add `topLevelAwait` and `wasm` to your `vite.config.ts`:

<!-- TODO: Turn this into a snippet -->

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [topLevelAwait(), wasm()],

  worker: {
    format: 'es',
    plugins: [topLevelAwait(), wasm()],
  },
});
```

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

<!-- TODO: Re-record this video-->

<video class="dark" controls loop autoplay style="width:100%" src="/images/hello-dark.mp4"></video> <video class="light" controls loop autoplay style="width:100%" src="/images/hello-light.mp4"></video>

::: info Why this is cool:

* State is being reactively shared between all instances of the app running on the same device. If more peers join the space, all of them will see updates reactively.
* Data is stored **locally**, in-browser, in [OPFS](https://fs.spec.whatwg.org/#origin-private-file-system) or [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API). **This enables privacy and gives end-users control over their data**.
* Remote peers exchange data directly, **peer-to-peer** over secure [WebRTC](https://webrtc.org/) connections.
* User identity (public/private keys) are established securely and maintained by [HALO](./halo/) for the whole device (browser profile), without a password.
* Everything works offline.
* Real-time collaboration is possible when online.
* There are **no servers** that store any data.
* There is no need for [ORMs](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping). ECHO objects are "plain javascript" objects that can be manipulated directly.
* **There is no need for an API tier.** The app has everything it needs on the client.

:::

### Deployment

By default DXOS template apps are static, Progressive Web Apps that work offline. They can be deployed with any regular static hosting technique like Netlify, Vercel, CloudFlare, GitHub Pages, an S3 bucket, and others.

The build command is `npm run build` which produces a static bundle in the output folder `out/<app-name>`, which can be changed in `vite.config.ts`.

For example, with [Netlify](https://netlify.com):

1. Go to "Add new site", and click "Import an existing project."
2. Link to your application's repository.
3. Set the build command and output directory.
4. Publish!

## Next steps

* Step-by-step [React tutorial](./echo/tutorial.md)
* ECHO with [React](./react/)
* ECHO with [TypeScript](./typescript/)
* ECHO with [strongly typed objects](./echo/typescript/queries.md#typed-queries)

We hope you'll find the technology useful, and we welcome your ideas and contributions:

* Join the DXOS [Discord](https://discord.gg/KsDBXuUxvD)
* DXOS [repository on GitHub](https://github.com/dxos/dxos)
* File a bug or idea in [Issues](https://github.com/dxos/dxos/issues)

Happy building! 🚀
