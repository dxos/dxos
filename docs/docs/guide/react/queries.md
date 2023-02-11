---
title: Queries
order: 4
---

# Queries

The simplest way to access data in `ECHO` from `react` is by using a `useQuery` on a `space`. This will return generic objects which can be mutated like regular JavaScript objects. [Type-safety](#type-safe-queries) can be added with the declaration of a schema.

## Untyped queries

The first argument to [`useQuery`](/api/@dxos/react-client/functions#usequery-space-filter) from package `@dxos/react-client` is the [`space`](../glossary#space) and the second is an optional filter which matches all objects which have all the keys and values specified in the filter. The return type is an iterable array of `Document` objects.

```tsx file=./snippets/use-query.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useOrCreateFirstSpace,
  useIdentity,
  useQuery,
  id,
} from '@dxos/react-client';

export const App = () => {
  useIdentity({ login: true });
  const space = useOrCreateFirstSpace();
  const tasks = useQuery(space, { type: 'task' });
  return <>
    {tasks?.map((item) => (
      <div key={item[id]}>{item.title}</div>
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

The API definition of `useQuery` is below. It returns a generic `Document` type which supports the ability to set and read arbitrary keys and values. See [below](#type-safe-queries) for how to add type safety.

:::apidoc[@dxos/react-client.useQuery]
### [useQuery(\[space\], \[filter\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useQuery.ts#L18)

Create subscription.

Returns: <code>[Document](/api/@dxos/react-client/classes/Document)\[]</code>

Arguments:

`space`: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

`filter`: <code>[Filter](/api/@dxos/react-client/types/Filter)\<T></code>
:::

## Type-safe Queries

It's possible to obtain strongly typed objects from `useQuery` if we provide a declaration of all the relevant types in a `schema`.

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
Note the directives `option (object) = true;` which instruct the framework to generate TypeScript classes from the marked `messages`.

Using a tool called `dxtype` from `@dxos/echo-schema` we can generate corresponding TypeScript types for use with DXOS Client.

```bash
dxtype <input protobuf file> <output typescript file>
```

::: info Tip
If you're using one of the DXOS [application templates](../cli/app-templates), this is pre-configured as a `prebuild` script for you.
:::
