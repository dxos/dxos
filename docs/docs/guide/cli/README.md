---
position: 1
label: Overview
dir:
  text: Command Line Tool
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
Use the following command to generate an app project with everything you need to build a collaborative application with DXOS.
```bash
dx app create hello
cd hello
pnpm install
pnpm serve # local development server
```

:::warning
Only `pnpm` is supported for now due to a temporary requirement to patch `vite`.
:::

## Deploying applications
Once you have a [KUBE](../kube) running, you can deploy your applications to it:
```bash
dx app publish
```
From within an application generated from a DXOS template, the npm script `deploy` is available:
```bash
pnpm run deploy
```
:::tip
Take care not to omit the term `run` as `pnpm` will assume `deploy` means something else otherwise
:::