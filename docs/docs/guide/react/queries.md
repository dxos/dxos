---
title: Queries
order: 4
---
# Queries

The simplest way to access data in `ECHO` from `react` is by using a `useQuery` on a `space`.

The first argument is the `space` and the second is an optional filter which matches all objects which have all the keys and values specified in the filter. 

```tsx file=./snippets/use-query.tsx#L5-
```

:::apidoc[@dxos/react-client.useQuery]
:::

### Using ECHO with Types

It's possible to obtain strongly typed objects from `useQuery` if we provide a declaration of all the relevant types in a `schema`.
