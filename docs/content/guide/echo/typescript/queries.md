---
order: 2
title: Queries
---

# Queries

The simplest way to read the items in a space is to use the `space.db.query()` method. It's also possible to obtain strongly typed results as described [below](#typed-queries).

## Untyped Queries

Once access is obtained to a [space](./README.md), objects can be retrieved:

```ts{12,14,16} file=./snippets/read-items.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

async () => {
  await client.initialize();

  // get a list of all spaces
  const spaces = client.spaces.get();

  // grab a space
  const space = spaces[0];

  // get all items
  const allObjects = await space.db.query().run();

  // get items that match a filter
  const tasks = await space.db.query({ type: 'task' }).run();

  // get items that match a predicate
  const finishedTasks = await space.db
    .query((doc: any) => doc.type === 'task' && doc.completed)
    .run();
};
```

The result is an iterable collection of objects that can be used like an array.

## Typed Queries

It's possible to receive strongly typed results from `query`. This is done by declaring a type using [Effect Schema](https://effect.website) for the objects in the space.

::: details Benefits of schema declarations

* ability to generate type-safe data access code, which makes development faster and safer.
  :::

Consider this expression of schema declared with Effect Schema:

```ts file=./snippets/schema.ts#L5-
import { S, TypedObject } from '@dxos/echo-schema';

export class TaskType extends TypedObject({
  typename: 'dxos.org/type/Task',
  version: '0.1.0',
})({
  name: S.String,
  completed: S.optional(S.Boolean),
}) {}
```

Types can be used to make queries as well:

```ts file=./snippets/read-items-typed-2.ts#L5-
import { Client } from '@dxos/client';
import { Filter } from '@dxos/client/echo';

import { TaskType } from './schema';

const client = new Client();

async () => {
  await client.initialize();
  client.addTypes([TaskType]);

  // get a list of all spaces
  const spaces = client.spaces.get();

  // grab a space
  const space = spaces[0];

  // get items that match a filter: type inferred from Task.filter()
  const tasks = await space.db.query(Filter.schema(TaskType)).run();
};
```

Note the `client.addTypes` call which registers the generated types with the client.
