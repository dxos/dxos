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
      {/* Your components here  */}
    </ClientProvider>
  );
};
```

### Options

:::apidoc[@dxos/client.ClientOptions]{.properties level="2"}
#### [config](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L30)

Type: <code>[Config](/api/@dxos/client/classes/Config)</code>

client configuration object

#### [modelFactory](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L34)

Type: <code>ModelFactory</code>

custom model factory

#### [services](https://github.com/dxos/protocols/blob/main/packages/sdk/client/src/packlets/client/client.ts#L32)

Type: <code>[ClientServicesProvider](/api/@dxos/client/interfaces/ClientServicesProvider)</code>

custom services provider
:::

***

Read the full API documentaion for Client [here](/api/@dxos/client)
