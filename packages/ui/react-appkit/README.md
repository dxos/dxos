# @dxos/react-appkit

DXOS opinions for building React applications

## Installation

```bash
pnpm i @dxos/react-appkit
```

## Usage

### Observability

To enable Sentry & Telemetry

Put the following in the entrypoint of an app:

```ts
import { initializeAppObservability } from "@dxos/react-appkit/observability";
initializeAppObservability(namespace, new Config(Defaults()));
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
- Talk to us on [Discord](https://discord.gg/eXVfryv3sW)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
