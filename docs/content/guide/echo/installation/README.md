---
dir:
  text: Installation
  order: 1
order: 0
---

# TypeScript

Install using package manager of choice `npm`,`yarn`,`pnpm`:

```bash
npm install --save @dxos/client
```

# Configuration

If using DXOS in a browser environment, [set up your Vite config](../../getting-started.md#usage-in-a-browser).

Create and initialize a `Client`:

```ts file=../../snippets-typescript/create-client.ts#L5-
import { Client } from '@dxos/client';

// create a client
const client = new Client();

const main = async () => {
  await client.initialize();
  // use client here
};

main();
```

An options object can be passed to `Client()`. See [configuration examples](../typescript/config.md).

To begin manipulating data, we must [create an identity](../../halo/typescript.md), and [join or create a space](../typescript/README.md).
