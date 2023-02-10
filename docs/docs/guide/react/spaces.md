---
order: 3
---

# Spaces

A `space` is an instance of an ECHO database which can be replicated by a number of peers.

This section describes how to create, join, and invite peers to [ECHO Spaces](../platform/#spaces) in `react`.

## Creating spaces

To create a space, call the `client.echo.createSpace()` API:

:::apidoc[@dxos/react-client.EchoProxy.createSpace]
### [createSpace()]()

Creates a new space.

Returns: <code>Promise<[Space](/api/@dxos/react-client/interfaces/Space)></code>

Arguments: none
:::

## Obtaining a Space reactively

These hooks are available from package [`@dxos/react-client`](https://www.npmjs.com/package/@dxos/react-client) and re-render reactively.

:::apidoc[@dxos/react-client.useSpace]
### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L18)

Get a specific Space using its key. Returns undefined when no spaceKey is
available. Requires a ClientProvider somewhere in the parent tree.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments:

`spaceKey`: <code>PublicKeyLike</code>
:::

:::apidoc[@dxos/react-client.useSpaces]
### [useSpaces()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L59)

Get all Spaces available to current user.
Requires a ClientProvider somewhere in the parent tree.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)\[]</code>

Arguments: none
:::

:::apidoc[@dxos/react-client.useOrCreateFirstSpace]
### [useOrCreateFirstSpace()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L29)

Returns the first space in the current spaces array. If none exist,  `null`
will be returned at first, then the hook will re-run and return a space once
it has been created. Requires a ClientProvider somewhere in the parent tree.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments: none
:::

### Example

```tsx file=./snippets/use-spaces.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Space } from '@dxos/client';
import {
  ClientProvider,
  useSpaces,
  useSpace,
  useOrCreateFirstSpace,
  useQuery,
  id
} from '@dxos/react-client';

export const TaskList = (props: { space: Space }) => {
  const { space } = props;
  const tasks = useQuery(space, { type: 'task' });
  return (
    <>
      {tasks?.map((item) => (
        <div key={item[id]}>{item.model.get('title')}</div>
      ))}
    </>
  );
};

export const App = () => {
  // usually space IDs are in the URL like in params.id: 
  const space1 = useSpace('<space_key_goes_here>');
  
  // get all spaces
  const spaces = useSpaces();
  const space2 = spaces?.[0]; // spaces may be null at first
  
  // get or create a first space:
  const space3 = useOrCreateFirstSpace();
  return <TaskList space={space3} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

## Joining spaces

See [the platform overview](../platform/#spaces) describing the general process of joining peers to a space.

In `react` the package `@dxos/react-appkit` offers components that implement the entire join flow.

To implement these in your own way, see the TypeScript API about [joining spaces](../typescript/spaces).

Using the pre-built space join flow for `react`:
```tsx file=./snippets/spaces-flows.tsx#L5-
```