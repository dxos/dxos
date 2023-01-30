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

In React, wrap your app with `<ClientProvider/>`. See [usage with React](react).

Before manipulating data, the client needs to create or join a [space](spaces).

Optionally, the client can be given a custom configuration via the `config` property. See the API documentaion for [Config](/api/@dxos/client/classes/Config).
```ts file=./snippets/create-client-with-options.ts#L5-
import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    // ...
  })
});
```

For more configuration recipes see [advanced scenarios](advanced).