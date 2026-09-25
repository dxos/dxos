# @dxos/automerge-proxy

Automerge-shaped documents whose reads and writes are synchronous, kept in step with a host that holds
the real Automerge documents over an asynchronous contract. The client side needs no Automerge at
runtime.

The package holds the parts with no dependency on ECHO. Each namespace has its own subpath; import
the ones a side needs, such as `import * as Repo from '@dxos/automerge-proxy/Repo'`.

| Subpath        | What it is                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------- |
| `Repo`         | `ProxyRepo`, the client's repo of proxy documents, and `Host`, the host as the repo sees it |
| `Handle`       | `DocHandle`, a handle with Automerge's shape over one proxy document                        |
| `Draft`        | The draft a `change()` callback writes through: behaves as Automerge's does and records ops |
| `Cursors`      | Automerge cursors over a text, resolved by the host once and then moved locally             |
| `Op`           | Ops on plain JSON values (put, del, insert, remove, splice), applying and inverting them    |
| `Transform`    | Rebases one op list over another, so a client and the host converge in either order         |
| `Sync`         | The client's confirmed and visible state, and the host's sequencer that orders batches      |
| `Contract`     | Schemas of the events and requests that cross between client and host                       |
| `Wire`         | Tags the values JSON cannot carry (RawString, bytes, dates, NaN and the like) and restores them |
| `Host`         | `DocumentHost`, which implements `Repo.Host` over a `Host.Store` of Automerge documents      |
| `Sequencing`   | `DocumentSequencer`, which orders every write to one Automerge document into entries         |
| `AutomergeOps` | Ops to and from Automerge: applying them in a change, diffing heads into ops                |

The first nine need nothing at runtime, so a client that imports only them loads no Automerge. `Host`,
`Sequencing` and `AutomergeOps` are the host's side and import Automerge.

`@dxos/automerge-proxy/testing` has what the package's property tests use: a seeded random generator,
random ops, a `MemoryStore` of Automerge documents, and a `Transport` that carries calls through JSON
after random delays and can lose responses.

ECHO uses it through `MirrorService` (`@dxos/protocols`), `MirrorRepo` and `MirrorDocHandle`
(`@dxos/echo-client`) and the worker's `MirrorServiceImpl` (`@dxos/echo-host`). [docs/DESIGN.md](./docs/DESIGN.md) covers what is
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
