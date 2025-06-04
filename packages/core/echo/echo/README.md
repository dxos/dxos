# @dxos/echo

ECHO API.

## Installation

```bash
pnpm i @dxos/echo
```

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS

## API

|                               | Object                         | Relation                       | Ref             |
| ----------------------------- | ------------------------------ | ------------------------------ | --------------- |
| **SCHEMA API**                |
| Define schema                 | `Type.def()`                   | `Relation.def()`               | `Ref()`         |
| Any schema type               | `Schema.AnyNoContext`          | `Schema.AnyNoContext`          | `Ref$<any>`     |
| Get DXN (of schema)           | `Type.getDXN`                  | `Type.getDXN`                  |                 |
| Get typename (of schema)      | `Type.getTypename`             | `Type.getTypename`             |                 |
| Get type metadata (of schema) | `Type.getMeta`                 | `Type.getMeta`                 |                 |
| Is mutable schema             | `Type.isMutable`               | `Type.isMutable`               |
| **DATA API**                  |
| Any instance type             | `AnyEchoObject`                | `AnyEchoObject`                | `Ref<any>`      |
| Create object                 | `Type.create(Schema, { ... })` | `Type.create(Schema, { ... })` | `Ref.make(obj)` |
| Check kind                    | `isEchoObject`                 | `isRelation`                   | `Ref.isRef`     |
| Check instance of             | `Type.instanceOf`              | `Type.instanceOf`              |                 |
| Get DXN (of instance)         | `getDXN`                       | `getDXN`                       |                 |
| Get typename (of instance)    | `getTypename`                  | `getTypename`                  |                 |
| Get Meta                      | `getMeta(obj)`                 | `getMeta(relation)`            |                 |
| Get relation source           |                                | `getSource`                    |
| Get relation target           |                                | `getTarget`                    |                 |

ISSUE: Return type of `getTypename`: string | DXN ??
ISSUE: Better any schema types: id, typename, meta? fields enforced
ISSUE: Better any instance types
ISSUE: Create vs live: Is it fundamentally the same thing?
