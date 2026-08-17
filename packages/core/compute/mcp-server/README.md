# @dxos/mcp-server

The DXOS MCP server: the tool and prompt surface projected from the operation registry.

Everything that decides what a model sees — which operations become tools, their names, schemas
and descriptions, which skills become prompts, and the server instructions — lives here, so every
host (the EDGE `mcp-space-service` worker, `dx mcp serve`) presents the same surface by
construction. Hosts supply a `Gateway` (how to reach the registry and invoke an operation) and a
transport; nothing else about the surface is theirs to decide.

## Installation

```bash
pnpm i @dxos/mcp-server
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [FSL-1.1-Apache-2.0](./LICENSE) Copyright 2022 © DXOS
