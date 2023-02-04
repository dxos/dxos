---
title: Identity
order: 2
---

# Identity

This section describes how to obtain [HALO identity](../identity) in `react`.

## Logging in

The user's identity can be obtained by a react application with the `useIdentity` hook:

```tsx file=./snippets/use-identity.tsx#L5-
import React from 'react';
import { useIdentity } from '@dxos/react-client';

export const MyComponent = () => {
  const identity = useIdentity();
  return <>{/* ... */}</>;
}
```

The object returned is of type [`Profile`](/api/@dxos/client/interfaces/Profile).

If an identity has not been established, `null` will be returned. In this case the user should be redirected to `halo.dxos.org` and they will be guided to establish identity.

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
      ]
    }
  ]);
};
```

Once identity is established, a [`space`](spaces) must be created or joined in order to manipulate data.