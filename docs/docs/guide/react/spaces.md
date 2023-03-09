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
        const space = await client.echo.createSpace();
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
### [useSpace(\[spaceKey\])](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L18)

Get a specific Space using its key. Returns undefined when no spaceKey is
available. Requires a ClientProvider somewhere in the parent tree.

Returns: <code>undefined | [Space](/api/@dxos/react-client/interfaces/Space)</code>

Arguments:

`spaceKey`: <code>PublicKeyLike</code>
:::

:::apidoc[@dxos/react-client.useSpaces]
### [useSpaces()](https://github.com/dxos/dxos/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L60)

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

```tsx{13,16,20} file=./snippets/use-spaces.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useSpaces,
  useSpace,
  useOrCreateFirstSpace,
  useQuery
} from '@dxos/react-client';

export const App = () => {
  // usually space IDs are in the URL like in params.id: 
  const space1 = useSpace('<space_key_goes_here>');
  
  // get all spaces
  const spaces = useSpaces();
  const space2 = spaces?.[0]; // spaces may be null at first
  
  // get or create a first space:
  const space3 = useOrCreateFirstSpace();
  
  // get objects from the space as an array of JS objects
  const objects = useQuery(space3);

  return <>{objects?.length}</>;
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

In `react` the package `@dxos/react-appkit` offers components that implement the entire join flow. See [how to include DXOS UI packages]() in your project, or use one of the DXOS [application templates](../cli/app-templates) which have DXOS UI pre-configured.

::: note Tip
To implement invitation flows manually, see the TypeScript API about [joining spaces](../typescript/spaces#creating-an-invitation).
:::

The pre-built space join flow is contained in the `SpacesPage` component for `react`. This is designed to be a panel or a full-screen page.

### SpacesPage

*   Lists spaces.
*   Allows joining spaces with an invite code.
*   Allows creating spaces.
*   Supports navigating to a space by clicking it.

```tsx file=./snippets/spaces-flows.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { SpacesPage } from '@dxos/react-appkit';

export const App = () => {
  // typically you would put this on a specific route like /spaces
  return (
    <SpacesPage
      spacePath="/spaces/:space" // how to navigate to a specific space
      onSpaceCreate={() => {
        // handle the event that the user clicks "create space"
        // this is where you can initialize the space with new objects
      }}
    />
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

See a more detailed example in the [`Tasks` application sample](../samples#tasks).

Learn more about the other react [UI Components](./ui) available from DXOS.
