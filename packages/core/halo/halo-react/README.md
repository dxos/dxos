# @dxos/halo-react

React hooks for the [`@dxos/halo`](../halo) services — the reactive, hook-based
consumer surface that mirrors `@dxos/react-client`'s HALO/space hooks but is
backed by the HALO Effect services instead of `@dxos/client` directly.

Provide the services once via `HaloProvider`, then use the hooks anywhere below
it. See [`../halo/CONSUMER_MIGRATION.md`](../halo/CONSUMER_MIGRATION.md) for the
hook-by-hook migration guide.

```tsx
import { Context } from 'effect';
import { Identity, Space } from '@dxos/halo';
import { makeIdentityService, makeSpaceService } from '@dxos/halo-adapter-client';
import { HaloProvider, useIdentity, useSpaces } from '@dxos/halo-react';

const services = Context.empty().pipe(
  Context.add(Identity.Service, makeIdentityService(client)),
  Context.add(Space.Service, makeSpaceService(client)),
);

const App = () => (
  <HaloProvider services={services}>
    <Main />
  </HaloProvider>
);

const Main = () => {
  const identity = useIdentity();
  const spaces = useSpaces();
  // ...
};
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2026 © DXOS
