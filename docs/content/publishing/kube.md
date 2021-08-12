---
title: Publishing to DXNS
---

> Make sure to have read [Environment Configuration](./configuration) section first.

## Build Settings

Before starting with the deployment process, we need to configure some stuff on our compiler:

1. **Build Folder**: Set your build folder to `dist` as it's used by default on the CLI (more on this later)

2. **Flat Build Folder**: Make your build folder flat (without nested files) so the app can find all the assets when running in the Kube

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

    configure: (webpackConfig, { env, paths }) => {
      const buildFolder = path.join(__dirname, 'dist'); // 1. This is setting the build folder to `dist`

      webpackConfig.output = {
        ...webpackConfig.output,
        path: buildFolder,
        filename: '[name].bundle.js', // 2. This is removing any possible parent dir that webpack could add to the file
        chunkFilename: '[name].[contenthash:8].chunk.js', // 2. This is removing any possible parent dir that webpack could add to the file
      };

      paths.appBuild = buildFolder; // 1. This is setting the build path also on craco

      return webpackConfig;
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

Once you run `yarn build` you will see all the compiled assets under the `dist` folder and no nested directories should be created.

## Deployment Process

It's time to make our app public for anyone. These are the steps to follow:

- [Install the CLI](https://dxos-docs.netlify.app/cli/installation/)
- [Create your profile](https://dxos-docs.netlify.app/cli/profile-creation/)
- [Set up your profile keys](https://dxos-docs.netlify.app/cli/profile-keys-setup/)
- [Claim your Authority](https://dxos-docs.netlify.app/cli/profile-authority/)
- [Deploy using the CLI](https://dxos-docs.netlify.app/cli/cli-app/app-deployment/)
- Check that your app is in the KUBE Network
  - How to access? [See the KUBE Docs](https://dxos-docs.netlify.app/kube/console-access/)
