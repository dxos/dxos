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

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), 
the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), 
and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS

## API

```ts
import { Type, Obj, Relation, Ref, Query, Filter } from '@dxos/echo';
```

|                               | Object                          | Relation                                    | Ref             |
| ----------------------------- | ------------------------------- | ------------------------------------------- | --------------- |
| **SCHEMA API**                |                                 |                                             |                 |
| Define schema                 | `Type.Obj()`                    | `Type.Relation()`                           | `Type.Ref()`    |
| Any schema type               | `Type.Obj.Any`                  | `Type.Relation.Any`                         | `Type.Ref.Any`  |
| Get DXN (of schema)           | `Type.getDXN(schema)`           | `Type.getDXN(schema)`                       |                 |
| Get typename (of schema)      | `Type.getTypename(schema)`      | `Type.getTypename(schema)`                  |                 |
| Get type metadata (of schema) | `Type.getMeta(schema)`          | `Type.getMeta(schema)`                      |                 |
| Is mutable schema             | `Type.isMutable(schema)`        | `Type.isMutable(schema)`                    |                 |
| **DATA API**                  |                                 |                                             |                 |
| Any instance type             | `Obj.Any`                       | `Relation.Any`                              | `Ref.Any`       |
| Create object                 | `Obj.make(Schema, { ... })`     | `Relation.make(Schema, { ... })`            | `Ref.make(obj)` |
| Check kind                    | `Obj.isObject(x): x is Obj.Any` | `Relation.isRelation(x): x is Relation.Any` | `Ref.isRef(x)`  |
| Check instance of             | `Obj.instanceOf(Schema, obj)`   | `Obj.instanceOf(Schema, rel)`               |                 |
| Get schema                    | `Obj.getSchema(obj)`            | `Obj.getSchema(obj)`                        |                 |
| Get DXN (of instance)         | `Obj.getDXN(obj)`               | `Obj.getDXN(obj)`                           |                 |
| Get typename (of instance)    | `Obj.getTypename(obj)`          | `Obj.getTypename(obj)`                      |                 |
| Get Meta                      | `Obj.getMeta(obj)`              | `Obj.getMeta(relation)`                     |                 |
| Is deleted                    | `Obj.isDeleted(obj)`            | `Obj.isDeleted(obj)`                        |                 |
| Get relation source           |                                 | `Relation.getSource(relation)`              |                 |
| Get relation target           |                                 | `Relation.getTarget(relation)`              |                 |
| Expando                       | `Expando`                       |                                             |                 |

```ts
Type.getDXN(schema) == DXN.parse('dxn:type:example.com/type/Person:0.1.0');
Type.getMeta(schema) == { typename: }
Type.getTypename(schema) === 'example.com/type/Person'
Type.getVersion(schema) === '0.1.0'

Obj.getDXN(obj) === DXN.parse('dxn:echo:SSSSSSSSSS:XXXXXXXXXXXXX')

// We need this for objects that have typename defined, but their schema can't be resolved (Obj.getSchema(obj) === undefined)
Obj.getSchemaDXN(obj) === DXN.parse('dxn:type:example.com/type/Person:0.1.0');

/**
 * @deprecated
 **/
// TODO(dmaretskyi): Consider keeping it as a shorthand for zType.getTypename(Obj.getSchema(obj)) ?? Obj.getSchemaDXN(obj)?.asTypeDXN()?.type`
Obj.getTypename(obj) === 'example.com/type/Person'
```

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

## Object model representation.

### JSON serialization

```ts
Obj.toJSON(obj);
Obj.fromJSON(json, { graph, db });
```

Defines attributes and encoding placed on objects.

|                  | Optional               | Runtime prop                        | Runtime type           | JSON prop                   | JSON type | Description                          |
| ---------------- | ---------------------- | ----------------------------------- | ---------------------- | --------------------------- | --------- | ------------------------------------ |
| Id               | No                     | `id`                                | `ObjectID` ULID string | `id`                        | string    | Unique object ID                     |
| Self DXN         | Yes                    | `Symbol(@dxos/echo/Self)`           | `DXN`                  | `@self`                     | string    | DXN to the object itself             |
| Typename         | No                     | `Symbol(@dxos/echo/Typename)`       | `DXN`                  | `@type`                     | string    | DXN to the object type               |
| Tombstone marker | Yes                    | `Symbol(@dxos/echo/Deleted)`        | `boolean`              | `@deleted`                  | boolean   | Deletion marker                      |
| Metadata         | Yes                    | `Symbol(@dxos/echo/Meta)`           | Metadata object        | `@meta`                     | object    | Metadata section                     |
| Entity kind      | No                     | `Symbol(@dxos/echo/EntityKind)`     | `EntityKind`           | (inferred from other props) | string    | Obj vs Relation                      |
| Relation Source  | No (only on relations) | `Symbol(@dxos/echo/RelationSource)` | `DXN`                  | `@relationSource`           | string    | Relation source DXN                  |
| Relation Target  | No (only on relations) | `Symbol(@dxos/echo/RelationTarget)` | `DXN`                  | `@relationTarget`           | string    | Relation target DXN                  |
| Hypergraph       | Yes                    | `Symbol(@dxos/echo/Hypergraph)`     | `Hypergraph`           | -                           | -         | Pointer to runtime hypergraph object |
| Database         | Yes                    | `Symbol(@dxos/echo/Database)`       | `Database`             | -                           | -         | Pointer to runtime database object   |

### Value representation

|           | Runtime | JSON                 |
| --------- | ------- | -------------------- |
| Reference | `Ref`   | `{ "/": "dxn:..." }` |
