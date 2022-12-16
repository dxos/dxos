---
order: 10
description: Using ECHO with React
---

# Using ECHO with React

Create a `ClientProvider` to allow nested components to `useClient` as well as use the other hooks in `@dxos/react-client`.

```tsx file=./snippets/create-client-react.tsx#L5-
import React, { createRoot } from 'react';
import { ClientProvider, useClient } from '@dxos/react-client';

const App = () => {
  const client = useClient();
  return <pre>{JSON.stringify(client.toJSON(), null, 2)}</pre>;
};

createRoot(document.body).render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```

A client object can also be passed in to Client provider:
```tsx file=./snippets/create-client-react-with-client.tsx#L5-
```

Alternatively, a config function may be supplied instead of a client, and a client will be generated internally. The fallback element will be displayed while the client is being initialized.

```tsx file=./snippets/create-client-react-with-config.tsx#L5-
import React from 'react';

import { Config } from '@dxos/client';
import { Dynamics, Defaults } from '@dxos/config';
import { ClientProvider } from '@dxos/react-client';

const App = () => {
  return (
    <ClientProvider
      config={async () => new Config(Defaults(), await Dynamics())}
      fallback={<div>Loading</div>}
    >
      {/* Your components can useClient() here  */}
    </ClientProvider>
  );
};
```

## React Hooks

The following are react hooks which ensure the reactivity of the underlying data sources and re-render consuming components when the data changes. Use all of these in a `<ClientProvider />` context.

:::apidoc[@dxos/react-client.useClient]
### [useClient()](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/client/ClientContext.tsx#L32)

Hook returning instance of DXOS client.
Requires ClientContext to be set via ClientProvider.

Returns: <code>Client</code>

Arguments: none
:::

:::apidoc[@dxos/react-client.useSpace]
### [useSpace(\[spaceKey\])](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSpaces.ts#L16)

Get a specific Space.
Requires ClientContext to be set via ClientProvider.

Returns: <code>undefined | Space</code>

Arguments:

`spaceKey`: <code>PublicKeyLike</code>
:::

:::apidoc[@dxos/react-client.useSelection]
### [useSelection(selection, deps)](https://github.com/dxos/protocols/blob/main/packages/sdk/react-client/src/echo/useSelection.ts#L20)

Hook to generate values from a selection using a selector function.

NOTE:
All values that may change the selection result  must be passed to deps array
for updates to work correctly.

Returns: <code>undefined | T\[]</code>

Arguments:

`selection`: <code>Selection\<T, void> | SelectionResult\<T, any> | Falsy</code>

`deps`: <code>readonly any\[]</code>
:::

## Example

Here's how a task list app might handle rendering a list in React:

```tsx file=./snippets/hooks.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Space } from '@dxos/client';
import { ClientProvider, useSpaces, useSelection } from '@dxos/react-client';

export const TaskList = (props: { space: Space }) => {
  const { space } = props;
  const rootItem = space.database.select({
    type: 'myapp:type/list'
  });
  const children = useSelection(
    rootItem.children().filter((item) => !item.deleted)
  );
  return (
    <>
      {children?.map((item) => (
        <div key={item.id}>{item.model.get('title')}</div>
      ))}
    </>
  );
};

export const App = () => {
  const spaces = useSpaces();
  // usually space IDs are in the URL and `useSpace(id)` would be appropriate
  const space = spaces[0];
  return <TaskList space={space} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <ClientProvider>
    <App />
  </ClientProvider>
);
```
