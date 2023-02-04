---
order: 2
label: Configuration
---

# Configuration

## Creating a `Client` instance

Having [installed the client](./installation), create an instance:

```ts file=./snippets/create-client.ts#L5-
import { Client } from '@dxos/client';

// create a client
const client = new Client();
```
:::note
If using React, `<ClientProvider/>` creates a `Client` for you. See usage with [React](react).
:::

Optionally, the client can be given a custom configuration via the `config` property.

:::details Custom configuration example
```ts file=./snippets/create-client-with-options.ts#L5-
import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    // ...
  })
});
```
:::

For more configuration recipes see [advanced scenarios](advanced).

To begin manipulating data, we must [create an identity](identity), and [join or create a space](spaces).