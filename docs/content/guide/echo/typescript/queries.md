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
  const finishedTasks = await space.db.query(
    (doc) => doc.type == 'task' && doc.isCompleted
  ).run();
};
```

The result is an iterable collection of objects that can be used like an array.

## Typed Queries

It's possible to receive strongly typed results from `query`. This is done by declaring a Protobuf schema for the objects in the space.

::: details Benefits of schema declarations

* ability to generate type-safe data access code, which makes development faster and safer.
  :::

[`Protobuf`](https://protobuf.dev/) is well oriented towards schema migrations, while at the same time being compact and efficient on the wire and in-memory.

Consider this expression of schema declared in [`protobuf`](https://protobuf.dev/):

```protobuf{6,13} file=../react/snippets/schema.proto
syntax = "proto3";

package example.tasks;

message Task {
  option (object) = true;

  string title = 1;
  bool completed = 2;
}

message TaskList {
  option (object) = true;

  string title = 1;
  repeated Task tasks = 2;
}
```

::: note
Note the directives `option (object) = true;` which instruct the framework to generate TypeScript classes from the marked `messages`.
:::

DXOS provides a tool for conveniently generating entity classes that work with the `query` interface.

Using a tool called `dxtype` from `@dxos/echo-typegen` classes can be generated for use with DXOS Client.

```bash
dxtype <input protobuf file> <output typescript file>
```

Install the `dxtype` tool as a dev dependency:

```bash
npm install --save-dev @dxos/echo-typegen
```

Install base types for the generated code:

```
npm install @dxos/echo-schema
```

Now scripts have access to `dxtype`:

```bash
dxtype <input protobuf file> <output typescript file>
```

::: info Tip
If you're using one of the DXOS [application templates](../../tooling/app-templates.md), this type generation step is pre-configured as a [`prebuild`](https://docs.npmjs.com/cli/v9/using-npm/scripts#pre--post-scripts) script for you.
:::

There are other utilities like a `filter` you can pass to `useQuery` to locate items of this type.

To use the type declarations, simply import the relevant type like `Task` from the typescript location out of `dxtype` and pass it to `query<T>`:

For example, defining types in a folder named `schema`:

The schema protobuf file:
::: details schema/schema.proto

```protobuf{6,13} file=./snippets/schema.proto
syntax = "proto3";

package example.tasks;

message Task {
  option (object) = true;

  string title = 1;
  bool completed = 2;
}

message TaskList {
  option (object) = true;

  string title = 1;
  repeated Task tasks = 2;
}
```

:::

The script in package.json:
::: details package.json

```json
{
  "scripts": {
    "prebuild": "dxtype schema/schema.proto schema/index.ts"
  }
}
```

:::

After executing `npm run prebuild`, types are available in `schema/index.ts`:

```ts file=./snippets/read-items-typed-2.ts#L5-
import { Client } from '@dxos/client';

import { Task, types } from './schema';

const client = new Client();

async () => {
  await client.initialize();
  client.addSchema(types);
  // get a list of all spaces
  const spaces = client.spaces.get();
  // grab a space
  const space = spaces[0];
  // get items that match a filter: type inferred from Task.filter()
  const tasks: Task[] = await space.db.query(Task.filter()).run();
};
```

Note the `client.addSchema(types)` call which registers the generated types with the client.
