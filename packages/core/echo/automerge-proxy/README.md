# @dxos/automerge-proxy

Automerge-shaped documents whose reads and writes are synchronous, kept in step with a host that holds
the real Automerge documents over an asynchronous contract. The client side needs no Automerge at
runtime.

The package holds the parts with no dependency on ECHO:

| Module      | What it is                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `Op`        | Ops on plain JSON values (put, del, insert, remove, splice), applying and inverting them       |
| `Transform` | Rebases one op list over another, so a client and the host converge in either order            |
| `Sync`      | The client's confirmed and visible state, and the host's sequencer that orders batches         |
| `Contract`  | Schemas of the events and requests that cross between client and host                          |
| `Wire`      | Tags the values JSON cannot carry (RawString, bytes, dates) and restores them                  |

`@dxos/automerge-proxy/testing` has a seeded random generator and random ops for property tests.

ECHO uses it through `MirrorService` (`@dxos/protocols`), `MirrorRepo` (`@dxos/echo-client`) and the
worker's `MirrorServiceImpl` (`@dxos/echo-host`). [docs/DESIGN.md](./docs/DESIGN.md) covers what is
still to move and the tests the boundary allows.

## Installation

```bash
pnpm i @dxos/automerge-proxy
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2026 © DXOS
