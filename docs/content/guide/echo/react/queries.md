---
title: Queries
order: 2
---

# Queries

The simplest way to access data in [`ECHO`](../) from `react` is by using a [`useQuery`](/api/@dxos/react-client/functions#usequery-space-filter) hook on a [`space`](../../glossary.md#space). This will return generic objects which can be [mutated](./mutations.md) like regular JavaScript objects. `useQuery<T>` can also return strongly typed results as will be shown [below](#typed-queries).

## Untyped queries

The first argument to [`useQuery`](/api/@dxos/react-client/functions#usequery-space-filter) from package `@dxos/react-client` is the [`space`](../../glossary.md#space) and the second is an optional filter which matches all objects which have all the keys and values specified in the filter. The return type is an iterable array of `Document` objects.

```tsx{10} file=./snippets/use-query.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery(space, { type: 'task' });
  return <>
    {tasks.map((task) => (
      <div key={task.id}>{task.title}</div>
    ))}
  </>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

The API definition of `useQuery` is below. It returns a generic `TypedObject` type which supports the ability to set and read arbitrary keys and values. See [below](#typed-queries) for how to add type safety.

:::apidoc[@dxos/react-client.useQuery]
### [useQuery(\[spaceOrEcho\], \[filter\], \[options\], \[deps\])](https://github.com/dxos/dxos/blob/175437b91/packages/sdk/react-client/src/echo/useQuery.ts#L30)

Create subscription.

Returns: <code>T\[]</code>

Arguments:

`spaceOrEcho`: <code>[Space](/api/@dxos/react-client/interfaces/Space) | [Echo](/api/@dxos/react-client/interfaces/Echo)</code>

`filter`: <code>[FilterSource](/api/@dxos/react-client/types/FilterSource)\<T></code>

`options`: <code>[QueryOptions](/api/@dxos/react-client/interfaces/QueryOptions)</code>

`deps`: <code>any\[]</code>
:::

## Typed Queries

It's possible to obtain strongly typed objects from `useQuery`.

Because `useQuery` returns tracked ECHO objects, their type must descend from [`TypedObject`](/api/@dxos/client/classes/TypedObject).

DXOS provides a tool to generate these types from a schema definition file.

::: details Benefits of schema declarations

* ability to generate type-safe data access code, which makes development faster and safer.
  :::

[`Protobuf`](https://protobuf.dev/) is well oriented towards schema migrations, while at the same time being compact and efficient on the wire and in-memory.

Consider this expression of schema declared in [`protobuf`](https://protobuf.dev/):

```protobuf{6,13} file=../../snippets-react/schema.proto
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

Using a tool called `dxtype` from `@dxos/echo-typegen` we can generate corresponding classes for use with DXOS Client.

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

To use the type declarations, simply import the relevant type like `Task` from the location where `dxtype` produces output and pass it to `useQuery<T>`.

For example, defining types in a folder named `schema`:

The schema protobuf file:
::: details schema/schema.proto

```protobuf{6,13} file=../../snippets-react/schema.proto
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

```tsx{7,12} file=./snippets/use-query-typed.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { Task, types } from './schema';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks: Task[] = useQuery(space, Task.filter());
  return (
    <>
      {tasks.map((task) => (
        <div key={task.id}>
          {task.title} - {task.completed}
        </div>
      ))}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider
    onInitialized={async (client) => {
      client.addSchema(types);
    }}
  >
    <App />
  </ClientProvider>,
);
```

You can pass `Task.filter` to `useQuery` to locate items that match specific criteria.

Note the `client.addSchema(types)` call which registers the generated types with the client.
