# @dxos/react-appkit

DXOS opinions for building React applications

## Installation

```bash
pnpm i @dxos/react-appkit
```

## Usage

### Sentry & Telemetry

Put the following in the entrypoint of an app:

```ts
initializeAppTelemetry(namespace, new Config(Defaults()));
```

Config is required to provide environment variables to the initialization.
It reads from the following variables:

- DX_SENTRY_DESTINATION
- DX_TELEMETRY_API_KEY
- DX_IPDATA_API_KEY

To hook up navigation and click telemetry events in an app, with the react-router context:

```ts
useTelemetry({ namespace });
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with `#dxos`
- Tag us on twitter [`@dxos_org`](https://twitter.com/dxos_org)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs). If you would like to contribute to the design and implementation of DXOS, please [start with the contributor's guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
