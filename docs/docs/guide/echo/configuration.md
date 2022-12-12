---
order: 2
label: Configuration
---

# Configuration

## Creating a client instance

Having [installed the client](./installation), create an instance:

```ts file=./snippets/create-client.ts#L5-
import { Client } from '@dxos/client';

// create a client
const client = new Client();
```

## Usage with React

Use `ClientProvider` to supply the `client` instance via `ReactContext` to any nested `useClient()` hooks.

```tsx file=./snippets/create-client-react.tsx#L5-
import React from "react";
import { Client } from "@dxos/client";
import { ClientProvider } from "@dxos/react-client";

const client = new Client();

const App = () => {
  return (
    <ClientProvider client={client}>
      {/* Your components can useClient() here  */}
    </ClientProvider>
  );
};
```

### Options

The client can be given a custom configuration via the config property of it's constructor's options. 

For example, here's how to set a custom signaling server:

```ts file=./snippets/create-with-signal-server.ts#L5-
import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    runtime: {
      services: {
        signal: {
          server: `wss://kube.dxos.org/.well-known/dx/signal`
        }
      }
    }
  })
});
```

See the API documentaion for [Config](/api/@dxos/client/classes/Config).

#### Loading defaults from a file
```ts file=./snippets/config-with-defaults.ts#L5-
```

#### Receiving config from a KUBE
```ts file=./snippets/config-with-dynamics.ts#L5-
```