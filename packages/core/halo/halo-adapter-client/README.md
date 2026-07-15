# @dxos/halo-adapter-client

Implements the `@dxos/halo` services (`Identity`, `Space`, `Invitation`) as Effect `Layer`s
backed by a `@dxos/client` instance. This is the composition-root adapter that lets application
code depend on the `@dxos/halo` service interfaces instead of `@dxos/client` directly.

```ts
import { layerClient } from '@dxos/halo-adapter-client';
import { Identity } from '@dxos/halo';

const program = Identity.current;
Effect.runPromise(Effect.provide(program, layerClient(client)));
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2026 © DXOS
