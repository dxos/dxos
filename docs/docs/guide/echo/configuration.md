---
order: 2
label: Configuration
---

# Configuration

Having [installed the client](./installation), create an instance:

```ts
import { Client } from "@dxos/client";

const client = new Client({ /* options */ });
```

### Options:

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
