---
title: Queries
order: 4
---

# Queries

The simplest way to access data in [`ECHO`](../platform) from `react` is by using a [`useQuery`](/api/@dxos/react-client/functions#usequery-space-filter) hook on a [`space`](../glossary#space). This will return generic objects which can be [mutated](./mutations) like regular JavaScript objects. `useQuery<T>` can also return strongly typed results as will be shown [below](#typed-queries).

## Untyped queries

The first argument to [`useQuery`](/api/@dxos/react-client/functions#usequery-space-filter) from package `@dxos/react-client` is the [`space`](../glossary#space) and the second is an optional filter which matches all objects which have all the keys and values specified in the filter. The return type is an iterable array of `Document` objects.

```tsx{14} file=./snippets/use-query.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useIdentity,
  useQuery,
  useSpaces
} from '@dxos/react-client';

export const App = () => {
  useIdentity({ login: true });
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

The API definition of `useQuery` is below. It returns a generic `Document` type which supports the ability to set and read arbitrary keys and values. See [below](#typed-queries) for how to add type safety.

:::apidoc[@dxos/react-client.useQuery]
### [useQuery(\[space\], \[filter\], \[options\], \[deps\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useQuery.ts#L19)

Create subscription.

Returns: <code>[TypedObject](/api/@dxos/react-client/values#TypedObject)\<Record\<string, any>>\[]</code>

Arguments:

`space`: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)\<T></code>

`options`: <code>[QueryOptions](/api/@dxos/react-client/types/QueryOptions)</code>

`deps`: <code>any\[]</code>
:::

## Typed Queries

It's possible to obtain strongly typed objects from `useQuery<T>`.

Because `useQuery` returns tracked ECHO objects, their type must descend from [`TypedObject`](/api/@dxos/client/classes/TypedObject). DXOS provides a tool to generate these types from a schema definition file.

> There are many benefits to expressing the type schema of an application in a language-neutral and interoperable way. One of them is the ability to generate type-safe data layer code, which makes development faster and safer.

[`Protobuf`](https://protobuf.dev/) is well oriented towards schema migrations, while at the same time being compact and efficient on the wire and in-memory.

Consider this expression of schema declared in [`protobuf`](https://protobuf.dev/):

```proto{6,13} file=./snippets/schema.proto
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

Using a tool called `dxtype` from `@dxos/echo-schema` we can generate corresponding classes for use with DXOS Client.

```bash
dxtype <input protobuf file> <output typescript file>
```

::: note
Note the directives `option (object) = true;` which instruct the framework to generate TypeScript classes from the marked `messages`.
:::

::: info Tip
If you're using one of the DXOS [application templates](../cli/app-templates), this type generation step is pre-configured as a [`prebuild`](https://docs.npmjs.com/cli/v9/using-npm/scripts#pre--post-scripts) script for you.
:::

::: details See TypeScript output from `dxtype`
The output is a typescript file that looks roughly like this:

```ts file=./snippets/schema.ts#L5-
import { TypedObject, TypeFilter, EchoSchema } from '@dxos/react-client';

export const schema = EchoSchema.fromJson(
  '{ "protobuf generated json here": true }'
);

export class Task extends TypedObject {
  static readonly type = schema.getType('example.tasks.Task');

  static filter(opts?: {
    title?: string;
    completed?: boolean;
  }): TypeFilter<Task> {
    return Task.type.createFilter(opts);
  }

  constructor(opts?: { title?: string; completed?: boolean }) {
    super({ ...opts, '@type': Task.type.name }, Task.type);
  }

  declare title: string;
  declare completed: boolean;
}
```

Declared are the ancestor class and specific fields on the type.

There are other utilities like a `filter` you can pass to `useQuery` to locate items of this type.
:::

To use the type declarations, simply import the relevant type like `Task` from the typescript location out of `dxtype` and pass it to `useQuery<T>`:

```tsx{11,16} file=./snippets/use-query-typed.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useIdentity,
  useQuery,
  useSpaces
} from '@dxos/react-client';

import { Task } from './schema';

export const App = () => {
  useIdentity({ login: true });
  const [space] = useSpaces();
  const tasks = useQuery<Task>(space, Task.filter());
  return <>
    {tasks.map((task) => (
      <div key={task.id}>{task.title} - {task.completed}</div>
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
