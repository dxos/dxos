[![build](https://github.com/dxos/protocols/actions/workflows/check.yaml/badge.svg)](https://github.com/dxos/protocols/actions/workflows/check.yaml)
[![publish](https://github.com/dxos/protocols/actions/workflows/publish.yaml/badge.svg)](https://github.com/dxos/protocols/actions/workflows/publish.yaml)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg?style=flat-square)](https://conventionalcommits.org)

![js-dxos](./docs/assets/images/github-repo-banner.png)

## DXOS Protocols

**dxos-js** is a monorepo containing the TypeScript implementation of the DXOS protocols, SDK, and toolchain.
If you are unfamiliar with DXOS, see our [website](https://dxos.org) for more information.


## Quick start

[Getting started](./docs/getting-started.md).


## Demo

Here's a demo of the ECHO database and data replication between twoo peers.

<br/>

![ECHO](https://user-images.githubusercontent.com/3523355/158708286-f9a8c5f1-83ed-4bac-ab9e-65ddb6861fe3.gif)

<br/>

To run the demo:

```bash
cd packages/demos/kichchen-sink
rushx demo:grid
```


## Installation and usage


## Deployment

Packages are deployed via [Release Please](https://github.com/dxos/protocols/blob/main/docs/internal/getting-started.md#release-process).


## Troubleshooting

For debugging, use the [DXOS DevTools extension](./packages/sdk/devtools-extension/README.md).
Also check the [FAQ section](./docs/internal/getting-started.md#FAQ).


## Contributing


## License

MIT


## Per-package targets (scripts)

- build:
    codegen
    protobuf
    tsc
    esbuild?

- check (or other verb):
    mocha
    eslint
    browser-mocha?
    ???

build before publish


- validate (or other verb, typecheck?):
  tsc --no emit
  esbuild --no emit?
  ... and pipe into vscode problem matcher
  todo: Integrate into toolchain spec


- test:
  mocha or jest

- lint:
  eslint

prettier (via eslint-plugin-prettier)?
