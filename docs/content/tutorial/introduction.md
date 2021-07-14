---
title: 0. Introduction
description: Learn how to build apps with DXOS
---

Welcome! This tutorial will lead you through the process of building a shareable task list app using [DXOS](https://github.com/dxos).

We have created a full-stack, real world example application to demonstrate the main aspects of the DXOS architecture and to make you feel comfortable building your own applications.

## What is the Tasks App?

The Tasks App is a simple collaborative task-tracking application that demonstrates the capabilities of the DXOS platform.
Here you will be guided through a step-by-step tutorial to build, debug, and deploy the application.

### Prerequisites

This tutorial assumes you are familiar with ES6, Node, and React.
Before proceeding, make sure your system meets the following requirements:

- Node.js v12+
- npm v6+ or yarn v1.20+ (We'll use `yarn` here)

### Material-UI

To create the visual side of the app and style React components we will be using Material-UI. It will be easier for you if you are familiar with this framework, but that is not required as we will be focusing on DXOS and provide all required styling. You can find out more about Material-UI [here](https://material-ui.com/).

## Clone the Tutorial Repository

Clone the [tutorial repository](https://github.com/dxos/dxos-tutorial-tasks-app) and install dependencies.

```bash
git clone git@github.com:dxos/dxos-tutorial-tasks-app.git
cd dxos-tutorial-tasks-app
yarn
```

## Start the App

The application has been created with [Create React App](https://reactjs.org/docs/create-a-new-react-app.html) and its config has been extended through [CRACO](https://github.com/gsoft-inc/craco).

Run the following command within the tasks-app folder to start the Tasks App Webpack development server.

```bash
yarn start
```

Now open the browser at [http://localhost:3000/](http://localhost:3000/) and you should see the page below:

![Tasks App - Initial Screen](./introduction-00.png)

You should see the page with a modal _Create Profile_ and input field for username below.

Go ahead and create a profile with your name to be able to see the tasks app working.
Play around with it a little bit if you want. We will go more in depth in the next section.
