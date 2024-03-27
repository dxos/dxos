---
order: 3
---

# Spaces

A `space` is an instance of an ECHO database which can be replicated by a number of peers.

This section describes how to create, join, and invite peers to [ECHO Spaces](../platform/#spaces) in `react`.

## Creating spaces

To create a space, call the `client.echo.createSpace()` API:

:::apidoc[@dxos/react-client.EchoProxy.createSpace]
### [createSpace(\[meta\])]()

Creates a new space.

Returns: <code>Promise<[Space](/api/@dxos/react-client/interfaces/Space)></code>

Arguments:

`meta`: <code>[PropertiesProps](/api/@dxos/react-client/types/PropertiesProps)</code>
:::

```tsx{10} file=./snippets/create-spaces.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider, useClient } from '@dxos/react-client';

export const App = () => {
  const client = useClient();
  return (
    <button
      onClick={async () => {
        const space = await client.spaces.create();
      }}
    ></button>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

## Obtaining a Space reactively

These hooks are available from package [`@dxos/react-client`](https://www.npmjs.com/package/@dxos/react-client) and re-render reactively.

:::apidoc[@dxos/react-client.useSpace]
### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/echo/useSpaces.ts#L21)

Get a specific Space using its key.
The space is not guaranteed to be in the ready state.
Returns the default space if no key is provided.
Requires a ClientProvider somewhere in the parent tree.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments:

`spaceKey`: <code>[PublicKeyLike](/api/@dxos/react-client/types/PublicKeyLike)</code>
:::

:::apidoc[@dxos/react-client.useSpaces]
### [useSpaces(options)](https://github.com/dxos/dxos/blob/29a91026f/packages/sdk/react-client/src/echo/useSpaces.ts#L62)

Get all Spaces available to current user.
Requires a ClientProvider somewhere in the parent tree.
By default, only ready spaces are returned.

Returns: <code>[Space](/api/@dxos/react-client/interfaces/Space)\[]</code>

Arguments:

`options`: <code>[UseSpacesParams](/api/@dxos/react-client/types/UseSpacesParams)</code>
:::

### Example

```tsx{13,16,20} file=./snippets/use-spaces.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import {
  Space,
  useQuery,
  useSpace,
  useSpaces
} from '@dxos/react-client/echo';

export const App = () => {
  // Usually space IDs are in the URL like in params.spaceKey.
  const space1 = useSpace('<space_key_goes_here>');
  
  // Get all spaces.
  const spaces = useSpaces();
  const space2: Space | undefined = spaces[0]; // Spaces may be an empty list.
  
  // Get objects from the space as an array of JS objects.
  const objects = useQuery(space2);

  return <>{objects.length}</>;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

## Default Space

Whenever an Identity is created, a Space is automatically created and marked as the **default Space**. In order to get the default space, simply call `useSpace` without any parameters:

```tsx file=./snippets/default-space.tsx#L5-
import React from 'react';
import {
  useQuery,
  useSpace,
} from '@dxos/react-client/echo';

export const App = () => {

  const defaultSpace = useSpace();

  // Get objects from the space as an array of JS objects.
  const objects = useQuery(defaultSpace);

  return <>{objects.length}</>;
};

```

## Joining spaces

See [the platform overview](../platform/#spaces) describing the general process of joining peers to a space.

Now that you have a space, you can invite people to it using our [Sharing UI flows](./sharing-ui-flows).

::: note Tip
To implement invitation flows manually, see the TypeScript API about [joining spaces](../typescript/spaces#creating-an-invitation).
:::

See a more detailed example in the [`Tasks` application sample](../samples#tasks).
