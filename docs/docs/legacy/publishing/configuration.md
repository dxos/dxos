---
title: Configuration
---

The `config` object we send to our client during initialization shouldn't be directly define on our code, 
but rather provided on each environment.

```jsx
const config = {
  app: { title: 'Tasks App' },
  storage: { persistent: true },
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' },
};
```

Let's prepare the ground for this.

## Config Files

Create a folder `config` at the root of your project and add the following files:

- `config.yml`: _special_ file that will be loaded if the `CONFIG_DYNAMIC` property is set to `false`.
  If `CONFIG_DYNAMIC` is set to `true` each app will try to load from an endpoint (using `{publicUrl}/.well-known/dx/config`).
  This allows to dynamically inject settings to our applications.

- `defaults.yml`: contains the default values for your app.

- `envs-map.yml`: provides a map between `process.env` vars and the config paths.

You can just place the config object on `yml` format in the `defaults.yml` file and leave the other two empty:

```yml:title=defaults.yml
app:
  title: 'Tasks App'
storage:
  persistent: true
swarm:
  signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal'
```

## Importing the Config in the App

Once you have your config files created, add a file `src/config.js` and place the following code:

```js:title=src/config.js
import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

const config = async () => new Config(await Dynamics(), Envs(), Defaults());

export const initConfig = () => config().then(({ values }) => values);
```

We are instantiating a `Config` object from `@dxos/config` package. 
This Config object is in charge of reading the files we created above:

```
Dynamics() -> config.yml
Envs() -> envs-map.yml
Defaults() -> defaults.yml
```

Finally, on our app, we should replace the `config` object with the `initConfig` function we are exporting above.

```js:title=src/App.js
import { initConfig } from './config';

const App = () => {
  return (
    <ClientInitializer config={initConfig}>
      <Root />
    </ClientInitializer>
  );
};
```

## Webpack ConfigPlugin

To make this package work properly, we need to make sure our Webpack settings have the `ConfigPlugin` 
from `@dxos/config` to load the config files.

```jsx:title=<root>/craco.config.js
const webpack = require('webpack');
const path = require('path');
const { ConfigPlugin } = require('@dxos/config/ConfigPlugin');
const BabelRcPlugin = require('@jackwilsdon/craco-use-babelrc');

const PUBLIC_URL = process.env.PUBLIC_URL || '';

module.exports = {
  plugins: [
    {
      plugin: BabelRcPlugin
    }
  ],
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      const buildFolder = path.join(__dirname, 'dist')
      webpackConfig.entry = './src/index.js'
      webpackConfig.output = {
        ...webpackConfig.output,
        path: buildFolder,
        filename: '[name].bundle.js',
        chunkFilename: '[name].[contenthash:8].chunk.js',
        publicPath: PUBLIC_URL,
      };
      paths.appBuild = buildFolder;
      return webpackConfig;
    },
    plugins: {
      add: [
       new webpack.ProvidePlugin({
          Buffer: [require.resolve('buffer/'), 'Buffer'],
        }),
        new ConfigPlugin({
          path: path.resolve(__dirname, 'config'),
          dynamic: process.env.CONFIG_DYNAMIC
        }),
      ],
    },
    config: {
      node: {
        Buffer: false
      }
    }
  },
};
```

> Remember, if you have your app running, you are going to need to stop it and start it again, so it takes new craco config into account. That's all!

---

If everything is properly set, your app should still be working same as it was on last section. 
But now, we are prepared to publicly deploy our app to a Kube.
