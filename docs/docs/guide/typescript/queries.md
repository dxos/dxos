---
order: 5
title: Queries
---

# Queries

Once access is obtained to a [space](./spaces), objects can be retrieved:

```ts file=./snippets/read-items.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

async () => {
  await client.initialize();
  // get a list of all spaces
  const { value: spaces } = client.echo.querySpaces();
  // grab a space
  const space = spaces[0];
  // get all items
  const allObjects = space.experimental.db.query();
  // get items that match a filter
  const tasks = space.experimental.db.query({ type: 'task' });
};
```

## Typed Queries

It's possible to receive strongly typed results from a `query`. Pass a type argument to `query<T>` which descends from [`Document`](/api/@dxos/client/classes/Document):
```ts file=./snippets/read-items-typed.ts#L5-

```

DXOS provides a tool for generating entity classes that work with the `query` 