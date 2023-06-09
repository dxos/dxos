---
order: 20
---

# Configuration examples

### Custom signaling server

To use a local [KUBE](../glossary#kube) [signaling server](../glossary#signaling-service) instead of the public default:

```ts file=./snippets/create-with-signal-server.ts#L5-
import { Client, Config } from '@dxos/client';

const client = new Client({
  config: new Config({
    runtime: {
      services: {
        signaling: [{
          server: 'wss://kube.dxos.org/.well-known/dx/signal'
        }]
      }
    }
  })
});
```

### Custom HALO source

By default the client will use `https://halo.dxos.org` as the storage [`vault`](../glossary#vault), but if there was a version of HALO deployed to a local KUBE, the `remoteSource` configuration value can be used to point the client to it:

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

To deploy a locally operated HALO application, clone the [`dxos`](https://github.com/dxos/dxos) repo, and follow the [repository guide](https://github.com/dxos/dxos/tree/main/REPOSITORY_GUIDE.md) to set up a local HALO build. HALO is a regular DXOS application with a [`dx.yml`](../cli/publishing) configuration file. You should be able to [start up a local KUBE](../quick-start#starting-a-kube) and [deploy to it](../quick-start#deploying-your-app-to-a-kube).

## Config Plugin

`@dxos/config` provides plugins for a number of bundlers which allow the config to be loaded from yaml files at the package root rather than specified inline.

::: code-tabs#plugin

@tab vite

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

export default defineConfig({
  ...
  plugins: [
    ConfigPlugin(),
    ...
  ]
});
```

@tab rollup

```js
// rollup.config.js
import { ConfigPlugin } from '@dxos/config/rollup-plugin';

export default {
  ...
  plugins: [
    ConfigPlugin(),
    ...
  ]
};
```

@tab esbuild

```ts
import { build } from 'esbuild';
import { ConfigPlugin } from '@dxos/config/esbuild-plugin';

await build({
  ...
  bundle: true,
  plugins: [
    ConfigPlugin(),
    ...
  ]
})

```

@tab webpack

```js
// webpack.config.js
import { ConfigPlugin } from '@dxos/config/webpack-plugin';

module.exports = {
  ...
  plugins: [
    new ConfigPlugin(),
    ...
  ]
};
```

:::

This allows config to be defined using one or more of the follow functions:

### Loading config defaults from a file

Any config included in the `dx.yml` file will be returned by `Defaults`.

```ts file=./snippets/create-with-defaults.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults } from '@dxos/config';

const client = new Client({
  config: new Config(Defaults())
});
```

::: note
In a Node environment, `Defaults` loads from a `config/default.yml` file in your project.
:::

### Local development configuration

Often it is convenient to have different configuration presets for local development.
For this purpose there is `Local` which will return any config included in the `dx-local.yml` file.

```ts file=./snippets/create-with-local.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults, Local } from '@dxos/config';

const client = new Client({
  config: new Config(Local(), Defaults())
});
```

::: note
In a Node environment, `Local` is a no-op.
:::

### Dynamic app configuration from KUBE

If your app is being hosted on a KUBE, use `Dynamics` to receive more specific configuration from that KUBE. With this mechanism, KUBE can serve apps in ways that redirect them to different signaling servers or `HALO` identity vaults.

```ts file=./snippets/create-with-dynamics.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults, Dynamics } from '@dxos/config';

const client = new Client({
  config: new Config(await Dynamics(), Defaults())
});
```

::: tip
The `Config` constructor uses `lodash.merge` to combine config objects. Earlier objects will take precedence over later objects, so `Defaults` should come last.
:::

::: note
If you want to provide config only for local-development, try including a `dx-dev.yml` file. If not being served from a KUBE, `Dynamics` will return the config from this file.
:::

### App configuration with environment variables

The config plugin provides an easy way to map environment variables to config values using the `dx-env.yml` file.

```ts file=./snippets/create-with-envs.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults, Dynamics, Envs } from '@dxos/config';

const client = new Client({
  config: new Config(await Dynamics(), await Envs(), Defaults())
});
```

This file takes the following format:

```yml
LOG_FILTER:
  path: runtime.client.log.filter
  type: string

LOG_PREFIX:
  path: runtime.client.log.prefix
  type: string

DX_PERSIST:
  path: runtime.client.storage.persistence
  type: boolean
```

### Loading app-specific environment variables

Bundlers such as Vite will automatically provide access to any enviroment variables prefixed with `VITE_`, however sometimes it's not convenient to prefix every variable you need access to. The config plugin provides a way to load arbitrary enviroment variables at build time.

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { ConfigPlugin } from '@dxos/config/vite-plugin';

export default defineConfig({
  ...
  plugins: [
    ConfigPlugin({
      env: ['MY_ENV_VAR']
    }),
    ...
  ]
});
```

This can then be accessed at the config path `runtime.app.env.MY_ENV_VAR`.
