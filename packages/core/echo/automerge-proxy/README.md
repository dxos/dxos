# @dxos/automerge-proxy

Automerge documents in a tab that loads no Automerge. A tab document holds every op with its
Automerge id in plain JS, encodes each change as Automerge would, and names it by the same hash, so
its heads are real the moment it writes. A host that holds the real Automerge document checks each
change and applies exactly those bytes.

Each namespace has its own subpath; import the ones a side needs, such as
`import * as Repo from '@dxos/automerge-proxy/Repo'`.

| Subpath     | What it is                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------- |
| `Automerge` | Automerge's whole API: a tab document answers from its model, anything else from Automerge        |
| `Handle`    | `TabDoc`, the tab document, and `DocHandle`, the handle a repo hands out over one                 |
| `Repo`      | `TabRepo`, a tab's repo of tab documents, and `Host`, the host as the repo reaches it             |
| `Contract`  | Schemas of the events and requests that cross between tab and host                                |
| `Host`      | `DocumentHost`, which implements `Repo.Host` over a `Host.Store` of Automerge documents           |
| `Draft`     | The draft a `change()` callback writes through: behaves as Automerge's does and records ops       |
| `Op`        | Ops on plain JSON values (put, del, insert, remove, splice), applying and inverting them          |
| `Wire`      | Tags the values JSON cannot carry in a document copy (RawString, bytes, dates) and restores them |

Everything but `Host` and `testing` needs nothing at runtime. `Automerge` imports no Automerge: a
realm that holds Automerge documents registers the module with `registerAutomerge`, Node registers
it on import, and a tab that registers nothing makes tab documents where Automerge would make its
own. Code imports it as `A` in place of `@automerge/automerge` and keeps its calls.

`@dxos/automerge-proxy/testing` has what the package's tests use: a `MemoryStore` of Automerge
documents, a `Transport` that clones every call after a random delay, a synchronous `MemoryTabHost`
and `TabNetwork` for deterministic tests of tab documents, and seeded random edits.

ECHO uses it through the tab-document RPCs of `DataService` (`@dxos/protocols`), `TabClientRepo`
and `TabDocHandle` (`@dxos/echo-client`), and the worker's `DataServiceImpl` over `createProxyHost`
(`@dxos/echo-host`). [docs/DESIGN.md](./docs/DESIGN.md) covers the contract;
[docs/INTEGRATION.md](./docs/INTEGRATION.md) the plan that brought it into ECHO.

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
