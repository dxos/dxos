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

If using React, you may pass an instance of `Client` to `<ClientProvider/>`, or it will create one for you otherwise. See [usage with React](react).

Before manipulating data, the client needs to create or join a [space](spaces).

## Ways of configuring `Client`

The client can be given a custom configuration via the config property of it's constructor's options.

### Custom signaling server

For example, here's how to set a custom signaling server:

```ts file=./snippets/create-with-signal-server.ts#L5-
import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    runtime: {
      services: {
        signal: {
          server: 'wss://kube.dxos.org/.well-known/dx/signal'
        }
      }
    }
  })
});
```

### Custom HALO source

Here's how to set a custom [HALO](../halo) source. By default the client will use `https://halo.dxos.org`, but if there was a version of HALO deployed to a local KUBE, the `remoteSource` configuration value can be used to point a client to it:

```ts file=./snippets/create-with-custom-vault.ts#L5-
import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    runtime: {
      client: {
        remoteSource: 'http://halo.localhost/vault.html'
      }
    }
  })
});
```

See the API documentaion for [Config](/api/@dxos/client/classes/Config).

### Loading defaults from a file

In a Node environment, you can use `@dxos/config` to load from a `config/default.yml` file in your project.

```ts file=./snippets/create-with-defaults.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults } from '@dxos/config';

const client = new Client({
  config: new Config(Defaults())
});
```

### Receiving config from a KUBE

If your app is being hosted on a KUBE, use `Dynamics` to receive more specific configuration from that KUBE. With this mechanism, KUBE can serve apps in ways that redirect them to different signaling servers or `HALO` identity vaults.

```ts file=./snippets/create-with-dynamics.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults, Dynamics } from '@dxos/config';

const client = new Client({
  config: new Config(Defaults(), await Dynamics())
});
```
