---
order: 1
title: Quick start
next: how-it-works
prev: why
---

# Quick start

## Using an ECHO database

Install ECHO with your package manager of choice

```bash
npm install --save @dxos/echo
```

To use ECHO you start with an instance of the [`Client`](/api/@dxos/client/classes/Client). It needs a configuration object of type [`Config`](/api/@dxos/config/classes/Config). Configuration typically comes from `dx.yml` files.

```ts file=./echo/snippets/create-client.ts#L5-
import { Client } from '@dxos/client';

// create a client
const client = new Client();
```

Read about all the [configuration options](/docs/echo/configuration).

To store data in ECHO, your client needs to create or join a [space](how-it-works#spaces).

```ts
```

Using `ClientProvider` and `useClient` with React:

```tsx file=./echo/snippets/create-client-react.tsx#L5-
import React from "react";
import { Client } from "@dxos/client";
import { ClientProvider } from "@dxos/react-client";

const client = new Client();

const App = () => {
  return (
    <ClientProvider client={client}>
      {/* Your components can useClient() here  */}
    </ClientProvider>
  );
};
```

Read more:

*   [ECHO overview](/docs/echo/overview)
*   [ECHO configuration](/docs/echo/configuration)
*   [ECHO with React](/docs/echo/react)
*   [how ECHO works](/docs/echo/how-echo-works)
*   Implement user identity with [HALO](/docs/halo/overview)

## Creating apps

The `dx` cli offers a production-ready application template for building **local-first applications** with ECHO. The template is made of `vite`, `typescript`, `react`, `echo`, `pwa`, and other opinions.

Using your favorite package manager of choice like `npm`, `yarn`, or `pnpm`:

```bash
npm i -g @dxos/cli 
```

Now you can use the `dx` command line tool:

```bash
dx app create hello # or with --template=bare
cd hello
npm run dev
```

This will start the development server in the new application .

Building your app for production:

```bash
npm build
```

This will produce a `dist` folder with an entry point and a `dist/README.md`

Read more:

*   [hello world template](https://)
*   [bare template](https://)

## Starting a KUBE

Runnig a [KUBE](/docs/kube/overview) gives you superpowers. Installation:

```bash
sudo ch=dev bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
```

Then:

```bash
kube start # start the service in the background
open localhost:9000 # open the browser to the console
```

Read more:

*   [KUBE Overview](/docs/kube/overview)

## Deploying your app to a KUBE

Use the `dx` cli to create a default `dx.yml` file:

```bash
dx app init
```

Read more about the [`dx.yml` file schema](/docs/kube/dx-yml-file).

Publish your app to your local kube:

```bash
dx app publish
```

Read more:

*   [Publishing apps](kube/publishing)
