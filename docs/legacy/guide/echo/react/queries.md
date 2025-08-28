---
title: Queries
order: 2
---

# Queries

The simplest way to access data in [`ECHO`](../) from `react` is by using a `useQuery` hook on a [`space`](../../glossary.md#space). This will return generic objects which can be [mutated](./mutations.md) like regular JavaScript objects. `useQuery<T>` can also return strongly typed results as will be shown [below](#typed-queries).

## Untyped queries

The first argument to `useQuery` from package `@dxos/react-client` is the [`space`](../../glossary.md#space) and the second is an optional filter which matches all objects which have all the keys and values specified in the filter. The return type is an iterable array of `Document` objects.

```tsx{11} file=./snippets/use-query.tsx#L5-
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

### useQuery(\[spaceOrEcho], \[filter], \[options], \[deps])

Create subscription.

Returns: <code>T\[]</code>

Arguments:

`spaceOrEcho`: <code>Space | Echo</code>

`filter`: <code>FilterSource\<T></code>

`options`: <code>QueryOptions</code>

`deps`: <code>any\[]</code>
:::

## Typed Queries

It's possible to obtain strongly typed objects from `useQuery`.

Because `useQuery` returns tracked ECHO objects, their type must descend from `TypedObject`.

DXOS provides apis to define these types using [Effect Schema](https://effect.website).

::: details Benefits of schema declarations

- ability to generate type-safe data access code, which makes development faster and safer.
  :::

Consider this expression of schema declared with Effect Schema:

```ts file=./snippets/schema.ts#L5-
import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo/internal';

export class TaskType extends TypedObject({
  typename: 'dxos.org/type/Task',
  version: '0.1.0',
})({
  name: Schema.String,
  completed: Schema.optional(Schema.Boolean),
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
  const tasks = useQuery(space, Filter.type(TaskType));
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
  <ClientProvider types={[TaskType]}>
    <App />
  </ClientProvider>,
);
```

Note the `client.addTypes` call which registers the types with the client.
