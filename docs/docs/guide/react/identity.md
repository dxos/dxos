---
order: 2
---

# Identity

This section describes how to obtain [HALO identity](../platform/halo) in `react`.

## Logging in

The user's identity can be obtained by a react application with the `useIdentity` hook:

```tsx file=./snippets/use-identity.tsx#L5-
import React from 'react';
import { useIdentity } from '@dxos/react-client/halo';

export const MyComponent = () => {
  const identity = useIdentity();
  return <>{/* ... */}</>;
};
```

The object returned is of type [`Identity`](/api/@dxos/client/interfaces/Identity).

By default `useIdentity` will tell HALO to log the user in using the [HALO vault](../typescript/vault), it will signal to the vault to open it's shell and allow the user to create an identity.

::: note
When first creating an identity, the `useIdentity` hook will fire twice. Once with `null`, and then again with an identity when one has been established.
:::

::: details Using with React Router
If using [`react-router`](https://www.npmjs.com/package/react-router) the component [`RequireIdentity`]() from [`@dxos/react-appkit`]() automatically redirects the user to the HALO app when no identity is found, and returns back when established.

```tsx file=./snippets/require-identity.tsx#L5-
import React from 'react';
import { useRoutes } from 'react-router-dom';
import { RequireIdentity } from '@dxos/react-appkit';

export const Routes = () => {
  return useRoutes([
    {
      element: <RequireIdentity />,
      children: [
        // ... other routes will fire only once identity is established
      ],
    },
  ]);
};
```

:::

Once identity is established, a [`space`](spaces) must be created or joined in order to manipulate data.
