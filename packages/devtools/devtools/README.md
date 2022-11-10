# @dxos/devtools

Standalone devtool app used to inspect DXOS client state

## Installation

```bash
pnpm i @dxos/devtools
```

## Usage

Standalone devtool app used to inspect DXOS client state.
It listens for a DXOS client in shared worker started by any app.

`dx.yml` contains `runtime.client.remoteSource` default endpoint with remote client.
It is used to listen for a halo-app shared worker (`pnpm nx serve halo-app`).

```bash
pnpm nx serve devtools
```

## Documentation

- [📚 API Reference](https://docs.dxos.org/api/@dxos/devtools)
- [🧩 Dependency Diagram](./docs/README.md)

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- [Blog](https://blog.dxos.org)
- [Roadmap](https://docs.dxos.org/roadmap)
- [Events calendar](https://blog.dxos.org/events)
- Hang out with the community on [Discord](https://dxos.org/discord)
- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with `#dxos`
- Tag us on twitter [`@dxos_org`](https://twitter.com/dxos_org)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](), the [issue guide](https://github.com/dxos/dxos/issues), and the [PR contribution guide](). If you would like to contribute to the design and implementation of DXOS, please [start with the contributor's guide]().

License: [MIT](./LICENSE.md) Copyright 2022 © DXOS
