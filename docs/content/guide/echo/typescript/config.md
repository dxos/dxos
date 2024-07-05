---
order: 4
---

# Configuration examples

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
  config: new Config(Defaults()),
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
  config: new Config(Local(), Defaults()),
});
```

::: note
In a Node environment, `Local` is a no-op.
:::

### App configuration with environment variables

The config plugin provides an easy way to map environment variables to config values using the `dx-env.yml` file.

```ts file=./snippets/create-with-envs.ts#L5-
import { Client, Config } from '@dxos/client';
import { Defaults, Dynamics, Envs, Local } from '@dxos/config';

const client = new Client({
  config: new Config(await Dynamics(), Envs(), Local(), Defaults()),
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
