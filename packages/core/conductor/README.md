# @dxos/conductor

Compute graph compiler.

## Installation

```bash
pnpm i @dxos/conductor
```

## Design

Conductor is a compute graph compiler that transforms declarative graph definitions into executable Effect-based functions.

### Core Architecture

**Graph Model** - Persistent compute graphs (`ComputeGraph`) consist of:
- **Nodes** (`ComputeNode`) - Processing units with typed inputs/outputs, supporting constants, templates, functions, AI operations, database queries, and control flow.
- **Edges** (`ComputeEdge`) - Typed connections between node outputs and inputs with property-level routing.

**Compilation Pipeline**:
1. **Topology Creation** - Validates graph structure, resolves node metadata, builds input/output connections, and collects diagnostics.
2. **Graph Execution** - `GraphExecutor` implements pull-based lazy evaluation with caching, resolving node computations on-demand as outputs are requested.

**Value Propagation** - `ValueBag` represents node inputs/outputs as independent Effect computations per property, enabling:
- Asynchronous resolution of individual properties.
- Control flow via `NotExecuted` markers for conditional branches.
- Schema validation at property boundaries.

**Node Registry** - Extensible catalog of built-in node types including system nodes (input/output), data sources (constants, templates, queues), transformations (functions, JSON operations), AI operations (GPT), control flow (if/switch), and outputs (text, surfaces).

**Effect Integration** - Nodes execute as Effect computations with access to services (AI, database, credentials, tracing) and proper error handling through typed error channels.

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
