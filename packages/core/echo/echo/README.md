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

**Exports**: `Type`, `Obj`, `Relation`, `Ref`

|                               | Object                          | Relation                                    | Ref                  |
| ----------------------------- | ------------------------------- | ------------------------------------------- | -------------------- |
| **SCHEMA API**                |
| Define schema                 | `Type.Obj()`                    | `Type.Relation()`                           | `Type.Ref()`         |
| Any schema type               | `Type.Obj.Any`                  | `Type.Relation.Any`                         | `Type.Ref.Any`       |
| Get DXN (of schema)           | `Type.getDXN(schema)`           | `Type.getDXN(schema)`                       |                      |
| Get typename (of schema)      | `Type.getTypename(schema)`      | `Type.getTypename(schema)`                  |                      |
| Get type metadata (of schema) | `Type.getMeta(schema)`          | `Type.getMeta(schema)`                      |                      |
| Is mutable schema             | `Type.isMutable(schema)`        | `Type.isMutable(schema)`                    |
| **DATA API**                  |
| Any instance type             | `Obj.Any`                       | `Relation.Any`                              | `Ref.Any`            |
| Create object                 | `Obj.make(Schema, { ... })`     | `Relation.make(Schema, { ... })`            | `Ref.make(obj)`      |
| Check kind                    | `Obj.isObject(x): x is Obj.Any` | `Relation.isRelation(x): x is Relation.Any` | `Ref.isRef`          |
| Check instance of             | `Obj.instanceOf(Schema, obj)`   | `Obj.instanceOf(Schema, rel)`               |                      |
| Get schema                    | `Obj.getSchema(obj)`            | `Obj.getSchema(obj)`                        | `Obj.getSchema(obj)` |
| Get DXN (of instance)         | `Obj.getDXN(obj)`               | `Obj.getDXN(obj)`                           |                      |
| Get typename (of instance)    | `Obj.getTypename(obj)`          | `Obj.getTypename(obj)`                      |                      |
| Get Meta                      | `Obj.getMeta(obj)`              | `Obj.getMeta(relation)`                     |                      |
| Is deleted                    | `Obj.isDeleted(obj)`            | `Obj.isDeleted(obj)`                        |                      |
| Get relation source           |                                 | `Obj.getSource(relation)`                   |
| Get relation target           |                                 | `Obj.getTarget(relation)`                   |                      |

ISSUE: Define nouns: Object, Relation, Ref; Obj, Objekt, Entity

ISSUE: Return type of `getTypename`: string | DXN ??

ISSUE: Better any schema types: id, typename, meta? fields enforced

ISSUE: Better any instance types

ISSUE: Create vs live: Is it fundamentally the same thing?

## Object construction

Option 1:

```ts
Relation.make(EmployeeOf, {
  [Relation.Source]: cyberdyne,
  [Relation.Target]: bill,
  [Obj.Meta]: {
    keys: [{ url: 'acme.com', id: '123' }],
  },
  since: '2022',
});
```

Option 2:

```ts
Obj.make(Contact, {
  name: 'Bill',
});

Relation.make(
  Employee,
  {
    source: cyberdyne,
    target: bill,
    meta: {
      keys: [{ url: 'acme.com', id: '123' }],
    },
  },
  {
    since: '2022',
  },
);
```
