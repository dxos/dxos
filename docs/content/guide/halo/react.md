---
order: 2
---

# React

This section describes how to obtain [HALO identity](../halo/) in `react`.

## Logging in

The user's identity can be obtained by a react application with the `useIdentity` hook:

```tsx file=./snippets-react/use-identity.tsx#L5-
import React from 'react';

import { useIdentity } from '@dxos/react-client/halo';

export const MyComponent = () => {
  const identity = useIdentity();
  return <>{/* ... */}</>;
};
```

The object returned is of type [`Identity`](/api/@dxos/client/interfaces/Identity).

By default `useIdentity` will tell HALO to log the user in using the HALO vault. The vault [shell](../glossary.md#shell) may open to allow the user to create an identity.

::: note
When first creating an identity, the `useIdentity` hook will fire twice. Once with `null`, and then again with an identity when one has been established.
:::

Once identity is established, a [`space`](../echo/react/README.md) must be created or joined in order to manipulate data.
