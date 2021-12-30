---
title: Publishing to DXNS
---

> Make sure to have read [Environment Configuration](./configuration) section first.

## Build Settings

Before starting with the deployment process, we need to explain you some stuff on our compiler:

1. **Build Folder**: We set our build folder to `dist` as it's used by default on the CLI (more on this later)
2. **Flat Build Folder**: We make our build folder flat (without nested files) so the app can find 
3. all the assets when running in the Kube

So, we've added some comment in the following snippet, that we already have in our `craco.config.js` file, 
to explain you better the steps above. 

```jsx:title=<root>/craco.config.js
 // ...

module.exports = {
  webpack: {
    
    // ...

    configure: (webpackConfig, { env, paths }) => {
      const buildFolder = path.join(__dirname, 'dist'); // 1. This is setting the build folder to `dist`
      webpackConfig.entry = './src/index.js'
      webpackConfig.output = {
        ...webpackConfig.output,
        path: buildFolder,
        filename: '[name].bundle.js', // 2. This is removing any possible parent dir that webpack could add to the file
        chunkFilename: '[name].[contenthash:8].chunk.js', // 2. This is removing any possible parent dir that webpack could add to the file
        publicPath: PUBLIC_URL,
      };

      paths.appBuild = buildFolder; // 1. This is setting the build path also on craco
      return webpackConfig;
    },

    // ...
  },
};
```

Once you run `yarn build` you will see all the compiled assets under the `dist` folder 
and no nested directories should be created.

## Deployment Process

It's time to make our app public for anyone. These are the steps to follow:

- [Install the CLI](https://dxos-docs.netlify.app/cli/installation/)
- [Create your profile](https://dxos-docs.netlify.app/cli/profile-creation/)
- [Set up your profile keys](https://dxos-docs.netlify.app/cli/profile-keys-setup/)
- [Claim your Authority](https://dxos-docs.netlify.app/cli/profile-authority/)
- [Deploy using the CLI](https://dxos-docs.netlify.app/cli/cli-app/app-deployment/)
- Check that your app is in the KUBE Network
  - How to access? [See the KUBE Docs](https://dxos-docs.netlify.app/kube/console-access/)
