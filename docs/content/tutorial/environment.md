---
title: Environment configuration
---

TODO(burdon): Ask Dmytro to simplify (remove) configuration across entire tutorial.

Do you remember the `config` object we created on the very first sections?

```jsx:title=src/App.js
const config = {
  app: { title: 'Tasks App' },
  storage: { persistent: true },
  swarm: { signal: 'wss://apollo3.kube.moon.dxos.network/dxos/signal' },
  wns: {
    server: 'https://apollo3.kube.moon.dxos.network/dxos/wns/api',
    chainId: 'devnet-2',
  },
};
```

Well, that shouldn't be defined on code but rather provided on each environment. Let's prepare the ground.

## Config Files

Create a folder `config` at the root of your project and add the following files:

- `config.yml`: _special_ file that will be loaded if the `CONFIG_DYNAMIC` property is set to `false`.
  If `CONFIG_DYNAMIC` is set to `true` each app will try to load from an endpoint (using `{publicUrl}/config/config.json`).
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
wns:
  server: 'https://apollo3.kube.moon.dxos.network/dxos/wns/api'
  chainId: 'devnet-2'
```

## Importing the Config in the App

Once you have your config files created, add a file `src/config.js` and place the following code:

```js:title=src/config.js
import { Config, Envs, Defaults, Dynamics } from '@dxos/config';

const config = async () => new Config(await Dynamics(), Envs(), Defaults());

export const initConfig = () => config().then(({ values }) => values);
```

We are instantiating a `Config` object from `@dxos/config` package. This Config object is in charge of reading the files we created above:

```
Dynamics() -> config.yml
Envs() -> envs-map.yml
Defaults() -> defaults.yml
```

Finally, on our `src/App.js` component, we should replace the `config` object with the `initConfig` function we are exporting above.

```jsx:title=src/App.js
import React from 'react';

import { ClientInitializer } from '@dxos/react-client';
import { CssBaseline } from '@material-ui/core';
import { createTheme } from '@material-ui/core/styles';
import { ThemeProvider } from '@material-ui/styles';
import Root from './components/Root';
import { initConfig } from './config';

const baseTheme = createTheme({
  overrides: {
    MuiCssBaseline: {
      '@global': {
        body: {
          margin: 0,
          overflow: 'hidden',
        },
      },
    },
  },
  sidebar: {
    width: 300,
  },
});

const App = () => {
  return (
    <ClientInitializer config={initConfig}>
      <ThemeProvider theme={baseTheme}>
        <CssBaseline />
        <Root />
      </ThemeProvider>
    </ClientInitializer>
  );
};

export default App;
```

## ConfigPlugin

To make this package work properly, we need to add to our Webpack settings the `ConfigPlugin` from `@dxos/config` to load the config files.

Go to your `craco.config.js` file and add the following:

```jsx:title=<root>/craco.config.js
const webpack = require('webpack');
const path = require('path');
const { ConfigPlugin } = require('@dxos/config/ConfigPlugin');

module.exports = {
  webpack: {
    config: {
      node: {
        Buffer: false,
      },
    },

    plugins: {
      add: [
        new webpack.ProvidePlugin({
          Buffer: [require.resolve('buffer/'), 'Buffer'],
        }),

        new ConfigPlugin({
          path: path.resolve(__dirname, 'config'),
          dynamic: process.env.CONFIG_DYNAMIC,
        }),
      ],
    },
  },
};
```

Remember, if you have your app running, you are going to need to stop it and start it again, so it takes new craco config into account. That's all!

---

If everything is properly set, your app should still be working same as it was on last section. But now, we are prepared to publicly deploy our app to a Kube.
