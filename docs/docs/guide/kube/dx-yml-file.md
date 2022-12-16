---
order: 3
label: dx.yml file
---

# `dx.yml` file

This file defines how your application is to be configured and deployed to a KUBE. It is placed at the root of a project and picked up by [`dx`](../cli) CLI during `dx publish`. If you're using a DXOS sample or template, there should be one provided for you by default.

Supply a `modules` section describing the array of modules to deploy. Each one has a name and a build command which govern the final DNS name and code of the app deployed to the KUBE. KUBE will host apps on subdomains of `localhost` like `<app>.localhost` and the KUBE's main hostname (`<app-name>.kube.local` by default).

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
```

## Deploying to your local KUBE

To deploy to a specific destination, configure [`dx`](../cli) CLI by opening it's configuration file located in `~/.config/dx/config.yml` by changing all the hostnames to localhost.

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
    signal:
      server: ws://localhost/.well-known/dx/signal
    ice:
      - urls: turn:localhost:3478
        username: dxos
        credential: dxos
    publisher:
      server: ws://localhost/.well-known/dx/deploy
```

## Configuration schema

See the API documentation entry for [`Config`](../../api/@dxos/config/classes/Config)
