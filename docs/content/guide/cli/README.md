---
order: 0
dir:
  text: Command Line Tools
  order: 19
---

# CLI Overview

The `dx` CLI offers a set of tools to work with DXOS components, interact with the network, and build applications.

## Installation

```bash
npm i -g @dxos/cli
```

a global `dx` should now be available

```bash
dx --version
```

## Creating applications

Use the following command to generate an app project named `hello` with everything you need to build a collaborative application with DXOS.

```bash
dx app create hello
cd hello
pnpm install
pnpm serve # local development server
```

:::warning
Only `pnpm` is supported for now due to a temporary requirement to patch `vite`.
:::

Learn more about the [application templates](./app-templates.md) available.

## Deploying applications

Static applications can be deployed to [KUBE](../kube/) with the `dx` CLI:

```bash
dx app publish
```

::: tip Tip
If using a DXOS application template, the npm script `deploy` uses a locally installed, version locked `dx` CLI to do the deploy:

```bash
pnpm run deploy
```

Take care not to omit the term `run` as `pnpm` will assume `deploy` means something else otherwise
:::

The configuration is read from a file [`dx.yml`](../kube/dx-yml-file) in the root of the project.
