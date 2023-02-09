---
title: Installation
order: 0
dir:
  text: TypeScript Guide
  order: 2
---

# ECHO Installation

Install using package manager of choice `npm`,`yarn`,`pnpm`:

```bash
npm install --save @dxos/client
```

# Configuration

```ts file=./snippets/create-client.ts#L5-
import { Client } from '@dxos/client';

// create a client
const client = new Client();
```

Optionally, the client can be given a custom configuration via the `config` property.

:::details Custom configuration example

```ts file=./snippets/create-client-with-options.ts#L5-
    // ...
  })
});
```

:::

For more configuration recipes see [configuration examples](config).

To begin manipulating data, we must [create an identity](identity), and [join or create a space](spaces).
