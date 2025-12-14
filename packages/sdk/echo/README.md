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

```ts
import { Type, Obj, Relation, Ref, Query, Filter } from '@dxos/echo';
```

|                               | Object                     | Relation (extends Obj)     | Ref            |
| ----------------------------- | -------------------------- | -------------------------- | -------------- |
| **SCHEMA API**                |
| Define schema                 | `Type.Obj()`               | `Type.Relation()`          | `Type.Ref()`   |
| Any schema type               | `Type.Obj.Any`             | `Type.Relation.Any`        | `Type.Ref.Any` |
| Get DXN (of schema)           | `Type.getDXN(schema)`      | `Type.getDXN(schema)`      |                |
| Get typename (of schema)      | `Type.getTypename(schema)` | `Type.getTypename(schema)` |                |
| Get type metadata (of schema) | `Type.getMeta(schema)`     | `Type.getMeta(schema)`     |                |
| Is mutable schema             | `Type.isMutable(schema)`   | `Type.isMutable(schema)`   |                |
| Expando                       | `Type.Expando`             |

|
| **DATA API** |
| Any instance type | `Obj.Any` | `Relation.Any` | `Ref.Any` |
| Create object | `Obj.make(Schema, { ... })` | `Relation.make(Schema, { ... })` | `Ref.make(obj)` |
| Check kind | `Obj.isObject(obj)` | `Relation.isRelation(obj)` | `Ref.isRef(ref)` |
| Get relation source | | `Relation.getSource(relation)` | |
| Get relation target | | `Relation.getTarget(relation)` | |
| Check instance of | `Obj.instanceOf(Schema, obj)` |
| Get schema | `Obj.getSchema(obj)` |
| Get DXN (of instance) | `Obj.getDXN(obj)` |
| Get typename (of instance) | `Obj.getTypename(obj)` |
| Get Meta | `Obj.getMeta(obj)` |
| Is deleted | `Obj.isDeleted(obj)` |

```ts
Type.getDXN(schema) == DXN.parse('dxn:type:example.com/type/Person:0.1.0');
Type.getMeta(schema) == { typename: }
Type.getTypename(schema) === 'example.com/type/Person'
Type.getVersion(schema) === '0.1.0'

Obj.getDXN(obj) === DXN.parse('dxn:echo:SSSSSSSSSS:XXXXXXXXXXXXX')

// We need this for objects that have typename defined, but their schema can't be resolved (Obj.getSchema(obj) === undefined)
Obj.getTypeDXN(obj) === DXN.parse('dxn:type:example.com/type/Person:0.1.0');

/**
 * @deprecated
 **/
// TODO(dmaretskyi): Consider keeping it as a shorthand for zType.getTypename(Obj.getSchema(obj)) ?? Obj.getTypeDXN(obj)?.asTypeDXN()?.type`
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

|                     | Optional                | Runtime prop                           | Runtime type           | JSON prop                   | JSON type  | Description                    |
| ------------------- | ----------------------- | -------------------------------------- | ---------------------- | --------------------------- | ---------- | ------------------------------ |
| Id                  | No                      | `id`                                   | `ObjectID` ULID string | `id`                        | string     | Unique object ID               |
| Self DXN            | Yes                     | `Symbol(@dxos/echo/DXN)`               | `DXN`                  | `@dxn`                      | string     | DXN to the object itself       |
| Type                | No                      | `Symbol(@dxos/echo/Type)`              | `DXN`                  | `@type`                     | string     | DXN to the object type         |
| Schema              | Yes                     | `Symbol(@dxos/echo/Schema)`            | Effect-Schema          | -                           |            | Reference to the object schema |
| Tombstone marker    | Yes                     | `Symbol(@dxos/echo/Deleted)`           | `boolean`              | `@deleted`                  | boolean    | Deletion marker                |
| Metadata            | Yes                     | `Symbol(@dxos/echo/Meta)`              | Metadata object        | `@meta`                     | object     | Metadata section               |
| Entity kind         | No                      | `Symbol(@dxos/echo/EntityKind)`        | `EntityKind`           | (inferred from other props) | string     | Obj vs Relation                |
| Relation Source DXN | No (only on relations)  | `Symbol(@dxos/echo/RelationSourceDXN)` | `DXN`                  | `@relationSource`           | DXN string | Relation source DXN            |
| Relation Target DXN | No (only on relations)  | `Symbol(@dxos/echo/RelationTargetDXN)` | `DXN`                  | `@relationTarget`           | DXN string | Relation target DXN            |
| Relation Source     | Yes (only on relations) | `Symbol(@dxos/echo/RelationSource)`    | `Object`               | -                           |            | Relation source object         |
| Relation Target     | Yes (only on relations) | `Symbol(@dxos/echo/RelationTarget)`    | `Object`               | -                           |            | Relation target object         |

> NOTE: All of the API functions can return `undefined` since they are also designed to work with objects outside of the database.
> TODO: Consider how Database, Hypergraph, and RefResolver are attached to the object.

### Value representation

|           | Runtime | JSON                 |
| --------- | ------- | -------------------- |
| Reference | `Ref`   | `{ "/": "dxn:..." }` |
