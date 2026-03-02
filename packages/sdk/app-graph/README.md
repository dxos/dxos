# @dxos/app-graph

## Relation API

Graph relation APIs use a structured relation object:

- `Relation = { kind: string; direction: 'outbound' | 'inbound' }`.
- Public methods accept `RelationInput = Relation | string`.
- If a string is passed, it is normalized to `{ kind: <string>, direction: 'outbound' }`.
- String values are always treated as relation kinds (`'inbound'` and `'outbound'` are not direction aliases).
- Callers must pass a relation explicitly (no implicit default relation argument).

Examples:

- Child traversal: `graph.connections(id, 'child')`.
- Child reverse traversal: `graph.connections(id, { kind: 'child', direction: 'inbound' })`.
- Action traversal: `graph.connections(id, 'action')`.
- Action reverse traversal: `graph.connections(id, { kind: 'action', direction: 'inbound' })`.

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2023 © DXOS
