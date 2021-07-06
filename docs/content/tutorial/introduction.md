---
title: 0. Introduction
description: Learn how to build apps with DXOS
---

Welcome! This tutorial will lead you through the process of building shareable task list app using [DXOS](https://github.com/dxos).

We have created a full-stack example as much "real-world" as possible, to demonstrate the main aspects of the architecture and to make you feel comfortable building your own applications.

## What's the Task List App?

The Tasks App is a demo of the capabilities of the DXOS platform.
It implements a simple collaborative task tracking applications.
On this section, you will be guided through a step-by-step tutorial to building, debugging, and deploying the application.

### Prerequisites

This tutorial assumes you are familiar with ES6, node, and React.
Before proceding, make sure your system matches the following requirements:

- Node.js v12+
- npm v6+ or yarn v1.20+ (We'll use `yarn` here)

### Material-UI

To create the visual side of the app and style react components we will be using Material-UI. It will be easier for you if you are familiar with it, but that is not required as we will focus rather on DXOS and provide every needed styling. More about Material-UI you can find [here](https://material-ui.com/).

## Clone the Tutorial Repository

// todo(grazianoramiro): set the proper URL to where the tasks-app repo will be.

Clone the [tutorial repository](https://github.com/dxos/tutorials) and install dependencies.

```bash
git clone https://github.com/dxos/tutorials.git
cd tutorials/apps/tasks-app
yarn
```

## Start the App

The application has been created with [Create React App](https://reactjs.org/docs/create-a-new-react-app.html) and its config has been extended through [CRACO](https://github.com/gsoft-inc/craco).

Run within the tasks-app folder the following command to start the Tasks App Webpack development server.

```bash
yarn start
```

Now open the browser at [http://localhost:3000/](http://localhost:3000/) and you should see the page below:

![Tasks App - Initial Screen](./introduction-00.png)

You should see the page with a modal _Create Profile_ and input field for username below.

Go ahead and create a profile with your name to be able to see the tasks app working.
Play around with it a little bit if you want. We will start breaking things into pieces on the next section.
