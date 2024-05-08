---
order: 0
dir:
  text: TypeScript Guide
  order: 10.1
---

# Installation

Install using package manager of choice `npm`,`yarn`,`pnpm`:

```bash
npm install --save @dxos/client
```

# Configuration

If using DXOS in a browser environment, [set up your Vite config](../getting-started.md#usage-in-a-browser).

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

An [Options](/api/@dxos/client/types/ClientOptions) object can be passed to `Client()`. See [configuration examples](config.md).

To begin manipulating data, we must [create an identity](identity.md), and [join or create a space](spaces.md).
