# @dxos/mcp-server

The DXOS MCP server: the tool and prompt surface projected from the operation registry.

Everything that decides what a model sees — which operations it can reach, their schemas and
descriptions, which skills become prompts, and the server instructions — lives here, so every host
(the EDGE `mcp-space-service` worker, `dx mcp serve`) presents the same surface by construction.
Hosts supply an `McpRegistry` (how to reach the registry and invoke an operation) and a transport;
nothing else about the surface is theirs to decide.

## The surface

Three tools, however many operations a host registers:

| Tool              | What it does                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------- |
| `findOperations`  | Searches the operations by text, skill or key; a `keys` lookup returns their full JSON Schemas |
| `invokeOperation` | Runs one by key, validating the input and resolving the target space                          |
| `skillLoad`       | Returns a skill's workflow text, or lists the skills when called with no argument             |

Operations are data the model searches rather than tools it is handed: advertising each as its own
tool spent the client's context on schemas for operations the task would never touch, and the cost
grew with every plugin a host enabled. A skill is still the unit of governance — an operation is
reachable only if an opted-in skill's `tools` list names it — and each opted-in skill is also
served as an MCP prompt.

Per-operation safety is reported on a `findOperations` row (`mutation`: `none` / `write` /
`destructive`) rather than as tool annotations, since one dispatch tool cannot be safer than
whatever it is asked to run.

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
