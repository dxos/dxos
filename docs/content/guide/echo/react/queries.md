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
  return (
    <>
      {tasks.map((task) => (
        <div key={task.id}>{task.title}</div>
      ))}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>,
);
```

The API definition of `useQuery` is below. It returns a generic `TypedObject` type which supports the ability to set and read arbitrary keys and values. See [below](#typed-queries) for how to add type safety.

:::apidoc[@dxos/react-client.useQuery]
### [useQuery(\[spaceOrEcho\], \[filter\], \[options\], \[deps\])](https://github.com/dxos/dxos/blob/ee0bfefcb/packages/sdk/react-client/src/echo/useQuery.ts#L21)

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

DXOS provides apis to define these types using [Effect Schema](https://effect.website).

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

```tsx file=./snippets/use-query-typed.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';

import { ClientProvider } from '@dxos/react-client';
import { Filter, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { TaskType } from './schema';

export const App = () => {
  useIdentity();
  const [space] = useSpaces();
  const tasks = useQuery(space, Filter.schema(TaskType));
  return (
    <>
      {tasks.map((task) => (
        <div key={task.id}>
          {task.name} - {task.completed}
        </div>
      ))}
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider
    onInitialized={async (client) => {
      client.addTypes([TaskType]);
    }}
  >
    <App />
  </ClientProvider>,
);
```

Note the `client.addTypes` call which registers the types with the client.
