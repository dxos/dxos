---
order: 3
next: ./echo
---

# Quick Start

DXOS is the developer platform for **collaborative**, **local-first**, **privacy-preserving** software.
This guide shows how to use [ECHO](./echo/) for peer-to-peer sync and [HALO](./halo/) for decentralized identity.

DXOS works in any Node.js or Browser environment. There is a [TypeScript API](./echo/typescript) and a [`react` API](./echo/react).

::: note In this guide

- Using with [TypeScript](#usage-with-typescript).
- Using with [React](#usage-with-react).

:::

## Usage with TypeScript

DXOS can be used in both the `node` and browser environments.

If you're using a browser environment, ensure you've set up your bundler to handle `wasm` (example [vite config](#usage-in-a-browser)).

```bash
# If node-gyp fails during post-install, `brew install python-setuptools` before trying again.
npm install --save @dxos/client
```

Create and initialize a `Client`:

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

An options object can be passed to `Client`. See [configuration examples](echo/typescript/config.md).

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

## Usage in a browser

DXOS recommends [Vite](https://vitejs.dev/) as the bundler. Vite requires a plugin in order to serve the WebAssembly modules.

```bash
npm install --save vite-plugin-top-level-await vite-plugin-wasm
```

Add `topLevelAwait` and `wasm` to your `vite.config.ts`:

```ts file=./snippets/vite-config.js#L5-
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [topLevelAwait(), wasm()],

  worker: {
    format: 'es',
    plugins: [topLevelAwait(), wasm()],
  },
});
```
