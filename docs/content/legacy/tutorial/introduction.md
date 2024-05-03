---
title: Introduction
sidebar_title: 0. Introduction
description: Getting started with DXOS applications
---

We have created a full-stack, real world example application to demonstrate the main aspects of the DXOS architecture
and to make you feel comfortable building your own applications.

TL;DR. If you want to jump ahead and look at the code directly, here is the Github
[@dxos/tutorial-tasks-app](https://github.com/dxos/tutorial-tasks-app) repository.

## What we'll build

This tutorial will lead you through the process of building a collaborative task list app powered by DXOS.

<br/>

![data](images/data-05.png)

<br/>


## Prerequisites

This tutorial assumes you are familiar with ES6, NodeJS, and React.
Before proceeding, make sure your system meets the following requirements:

- Node.js v12+
- npm v6+ or yarn v1.20+ (We'll use `yarn` here.)

## Create an empty application

We will be using [Create React App](https://reactjs.org/docs/create-a-new-react-app.html) to start the new application.

```bash
npx create-react-app tasks-app
cd tasks-app
yarn start
```

You should now see your app running on [http://localhost:3000](http://localhost:3000) with React logo.

## Install DXOS Dependencies

Let's start by installing the required dependencies from the DXOS Stack:

```bash
yarn add @dxos/react-client @dxos/react-toolkit @dxos/config @dxos/document-model
```

Applications depend on the following libraries.

| Syntax                  | Description           |
| ----------------------- | --------------------- |
| `@dxos/react-client`    | Main API              |
| `@dxos/react-toolkit` | Main React (UX) API   |
| `@dxos/config`          | Configuration support |
| `@dxos/document-model`    | ECHO Object model     |

## Material-UI

To create the visual side of the app and style React components we will be using Material-UI.
It will be easier for you if you are familiar with this framework,
but that is not required as we will be focusing on DXOS and provide all required styling.
You can find out more about Material-UI [here](https://material-ui.com/).

```bash
yarn add @material-ui/core @material-ui/styles @material-ui/icons @material-ui/lab
```

## CRACO

"_Create React App Configuration Override is an easy and comprehensible configuration layer for create-react-app._"

This tool will be used to override some Webpack settings that are required for DXOS.
You can read more about it [here](https://github.com/gsoft-inc/craco)

```bash
yarn add @craco/craco @jackwilsdon/craco-use-babelrc webpack@4.44.2 @babel/plugin-transform-runtime
```
> We use specific version of Webpack to meet dependecies of the react-script package that is used by @craco/craco package.

Create a `craco.config.js` file at the root of your project with the following script:

```js
const webpack = require('webpack');
const BabelRcPlugin = require('@jackwilsdon/craco-use-babelrc');

module.exports = {
  plugins: [
    {
      plugin: BabelRcPlugin
    }
  ],
  webpack: {
    plugins: {
      add: [
        new webpack.ProvidePlugin({
          Buffer: [require.resolve('buffer/'), 'Buffer']
        })
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
> The Webpack settings are required to polyfill the NodeJS Buffer object to run in the browser and also to enable babel for backwards compatibility.

Then go to your `package.json` and in your npm scripts replace `react-scripts` with `craco`:

```json
{
  "scripts": {
    "start": "craco start",
    "build": "craco build",
    "test": "craco test",
    "eject": "craco eject"
  }
}
```

After that, create a `.babelrc` file at the root of your project with the following code:

```json
{
  "presets": ["@babel/preset-env", "@babel/preset-react"],
  "plugins": ["@babel/plugin-transform-runtime"]
}
```

If you have your app running, stop it and start it again so it takes the new changes above. You are ready to go!

---
> REMEMBER to import React, Material UI and their respective hooks in each section - we omitted them from the tutorial to make it simpler.
