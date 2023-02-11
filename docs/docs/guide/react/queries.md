---
title: Queries
order: 4
---

# Queries

The simplest way to access data in `ECHO` from `react` is by using a `useQuery` on a `space`.

## Untyped queries

The first argument to [`useQuery`](/api/@dxos/react-client/functions#usequery-space-filter) from package `@dxos/react-client` is the [`space`](../glossary#space) and the second is an optional filter which matches all objects which have all the keys and values specified in the filter.

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

Arguments:

`space`: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

`filter`: <code>[TypeFilter](/api/@dxos/react-client/types/TypeFilter)\<T></code>
Create subscription.

Returns: <code>[Document](/api/@dxos/react-client/classes/Document)\[]</code>
:::

## Type-safe Queries

It's possible to obtain strongly typed objects from `useQuery` if we provide a declaration of all the relevant types in a `schema`.
