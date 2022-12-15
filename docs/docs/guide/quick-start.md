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
import { Client } from '@dxos/client';

const client = new Client();

const space = await client.echo.createSpace();
```

Read more about [configuring the client](echo/configuration).

Now you can manipulate items in the space and they will replicate with all members of the space in a peer-to-peer fashion.

```ts file=./echo/snippets/write-items.ts#L9-
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
```

Read more:

- [ECHO overview](echo)
- [ECHO configuration](echo/configuration)
- [ECHO with React](echo/react)

## Creating apps with `dx` CLI

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

- [hello world template](cli/app-templates.md#hello-template)
- [bare template](cli/app-templates.md#bare-template)

## Starting a KUBE

Runnig a [KUBE](/docs/kube/overview) gives you superpowers. Installation:

```bash file=./snippets/install-kube.sh
sudo ch=dev bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
```

Then:

```bash
sudo kube start # start the service in the background
kube status # verify it's running
```

Once KUBE is running, you're ready to deploy.

Read more:

- [KUBE Overview](kube)

## Deploying your app to a KUBE

To deploy to your local kube:

- Ensure a [KUBE](#starting-a-kube) is running
- [Install](#creating-apps) and [configure your `dx` CLI to deploy to your KUBE](kube/dx-yml-file#deploying-to-your-local-kube)
- Ensure there is a [`dx.yml`](kube/dx-yml-file) file in the project root
- Run this:

```bash
dx app publish
```

DXOS application templates provide this in a deploy script:

```bash
pnpm run deploy
```

Your app will now be accessible in a browser `<app-name>.localhost:9002`.

If you started with `dx app create hello`, the app will be on [`hello.localhost:9002`](http://hello.localhost:9002).

Read more:

- The [`dx.yml` file schema](kube/dx-yml-file). One is provided for you if you're using a DXOS [template](cli/templates) or [sample](samples).
