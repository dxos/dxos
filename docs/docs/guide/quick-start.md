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
npm install --save @dxos/client
```

To use ECHO you start with an instance of the [`Client`](/api/@dxos/client/classes/Client).

To store data in ECHO, your client needs to [create or join a space](echo/spaces).

```ts file=./echo/snippets/create-space.ts#L5-
import { Client } from "@dxos/client";

const client = new Client();

const space = await client.echo.createSpace();
```

Read more about [configuring the client](echo/configuration).

Now you can manipulate items in the space and they will replicate with all members of the space in a peer-to-peer fashion.

```ts file=./echo/snippets/query-spaces.ts#L9-
// decide on a type for your items
const type = 'yourdomain:type/some-type-identifier';

// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();

// create a regular ObjectModel item
const item = await spaces[0].database.createItem({
  type,
  model: ObjectModel
});

// set a property value
item.model.set('someKey', 'someValue');

// query items
const items = spaces[0].database.select({ type });
```

### React usage

Use `ClientProvider` and `useClient` with React:

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

*   [ECHO overview](guide/echo)
*   [ECHO configuration](guide/echo/configuration)
*   [ECHO with React](guide/echo/react)
*   [how ECHO works](guide/echo/how-echo-works)
*   Implement user identity with [HALO](guide/halo/overview)

## Creating apps

The `dx` cli offers a production-ready application template for building **local-first applications** with ECHO. The template is made of `vite`, `typescript`, `react`, `echo`, `pwa`, and other opinions.

Using `pnpm`:

```bash
npm i -g @dxos/cli 
```

Now you can use the `dx` command line tool:

```bash
dx app create hello # or with --template=bare
cd hello
pnpm serve
```

This will start the development server in the new application.

:::warning
Only `pnpm` is currently supported by the application templates for now due to a need to patch `vite`. This should be resolved soon.
:::

Building your app for production:

```bash
npm build
```

This will produce an `out` folder with an entry point.

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

Drop a `dx.yml` file in the project root and run the following command. Read more about the [`dx.yml` file schema](/docs/kube/dx-yml-file). One is provided for you if you're using a DXOS [template](cli/templates) or [sample](samples).

Publish your app to your local kube:

```bash
dx app publish
```

Read more:

*   [Publishing apps](kube/publishing)
