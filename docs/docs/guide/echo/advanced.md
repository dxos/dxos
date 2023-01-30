---
title: Advanced Scenarios
order: 20
---
# Advanced scenarios

### Custom signaling server

o use a local [KUBE](glossary#kube) [signaling server](glossary#signaling-service) instead of the public default:

```ts file=./snippets/create-with-signal-server.ts#L5-
import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    runtime: {
      services: {
        signal: {
          server: 'ws://localhost/.well-known/dx/signal'
        }
      }
    }
  })
});
```

### Custom HALO source

By default the client will use `https://halo.dxos.org`, but if there was a version of HALO deployed to a local KUBE, the `remoteSource` configuration value can be used to point the client to it:

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

### Loading config defaults from a file

In a Node environment, you can use `@dxos/config` to load from a `config/default.yml` file in your project.

```ts file=./snippets/create-with-defaults.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults } from '@dxos/config';

const client = new Client({
  config: new Config(Defaults())
});
```

### Dynamic app configuration from KUBE

If your app is being hosted on a KUBE, use `Dynamics` to receive more specific configuration from that KUBE. With this mechanism, KUBE can serve apps in ways that redirect them to different signaling servers or `HALO` identity vaults.

```ts file=./snippets/create-with-dynamics.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults, Dynamics } from '@dxos/config';

const client = new Client({
  config: new Config(Defaults(), await Dynamics())
});
```
To receive dynamic configuration synchronously, ensure there is a `let __DXOS_CONFIG__;` statement in a `<script>` in the `index.html` of your app somewhere before your code executes.