---
title: Getting Started
---

This short tutorial gets you up and running with the DXOS Client.

It will lead you through the process of building a shareable task list app using [DXOS](https://github.com/dxos).

We have created a full-stack, real world example application to demonstrate the main aspects of the DXOS architecture 
and to make you feel comfortable building your own applications.

### Prerequisites

This tutorial assumes you are familiar with ES6, Node, and React.
Before proceeding, make sure your system meets the following requirements:

- Node.js v12+
- npm v6+ or yarn v1.20+ (We'll use `yarn` here.)

## Create an empty application

We will be using [Create React App](https://reactjs.org/docs/create-a-new-react-app.html) to start the new application. 
You can read the docs to understand how it works or directly run:

```bash
npx create-react-app tasks-app
cd tasks-app
yarn start
```

You should now see your app running on [http://localhost:3000](http://localhost:3000) with React logo.

## Install DXOS Dependencies

Let's start by installing the required dependencies from the DXOS Stack:

```bash
yarn add @dxos/react-client @dxos/react-ux @dxos/config @dxos/object-model
```

Applications depend on the following libraries.

| Syntax                | Description |
| --------------------- | ----------- |
| `@dxos/react-client`  | Main API |
| `@dxos/react-ux`      | Main React (UX) API |
| `@dxos/config`        | Configuration support |
| `@dxos/object-model`  | ECHO Object model |

## Additional Dependencies

### Material-UI

To create the visual side of the app and style React components we will be using Material-UI. 
It will be easier for you if you are familiar with this framework, 
but that is not required as we will be focusing on DXOS and provide all required styling. 
You can find out more about Material-UI [here](https://material-ui.com/).

```bash
yarn add @material-ui/core @material-ui/styles @material-ui/icons
```

### CRACO

"_Create React App Configuration Override is an easy and comprehensible configuration layer for create-react-app._"

This tool will be used to override some Webpack settings that are required for DXOS. 
You can read more about it [here](https://github.com/gsoft-inc/craco)

```bash
yarn add @craco/craco
```

We will provide you the specific settings in the next sections.

## Next Steps

You are all set up! Go to the next section to start writing some real code.
