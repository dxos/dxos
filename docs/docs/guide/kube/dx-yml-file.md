---
order: 3
label: dx.yml file
---

# `dx.yml` file

This file defines how an application is to be configured and deployed to KUBE. It is placed at the root of a project and picked up by [`dx`](../cli) CLI during `dx publish`. If using a DXOS [sample](../samples) or [template](../cli/app-templates), there is one provided by default.

Supply a `modules` section describing the array of modules to deploy. Each one has a name which governs the final DNS name of the app deployed to the KUBE. KUBE will host apps on subdomains of `localhost` like `<app>.localhost` and the KUBE's [main hostname](./commands#configuration) (`<app-name>.kube.local` by default).

An example `dx.yml` file:

```yaml
version: 1
modules:
  - type: dxos:type/app
    name: app-for-test
    display_name: Tasks List
    description: Mock application
    tags:
      - tasks
      - todo
      - productivity
    build:
      command: pnpm run build
      outdir: 'out'
      version: 1.2.3
      tag: latest
    tunnel: false
```

## Deploying to KUBE

To deploy to a specific KUBE, configure the [`dx`](../cli) CLI by opening it's configuration file located in `~/.config/dx/config.yml` and changing all the hostnames to the desired destination (such as the local KUBE on `localhost`).

::: tip Tip
The hostname is the part of a URL between the protocol and the port: e.g.: `https://hostname:port/path?query#hash`
:::

Example `~/.config/dx/config.yml` configuration file which instructs `dx` CLI to use the local KUBE:

```yml file=./snippets/dx-cli-config-local.yml
version: 1

runtime:
  client:
    storage:
      persistent: true
      path: /tmp/dx/cli

  services:
    ipfs:
      server: http://localhost:5001/
      gateway: http://localhost:8888/ipfs
    signaling:
      - server: ws://localhost/.well-known/dx/signal
    ice:
      - urls: turn:localhost:3478
        username: dxos
        credential: dxos
    publisher:
      server: ws://localhost/.well-known/dx/deploy
```

## Configuration schema

See the API documentation entry for [`Config`](../../api/@dxos/config/classes/Config)
