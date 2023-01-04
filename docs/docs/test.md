# Test

This is an unlisted page which may be useful for testing new docs functionality.

:::showcase[demo=Test#L5-L13]
```tsx
import React from 'react';

import { useClient } from '@dxos/react-client';

const Test = () => {
  const client = useClient();

  return <pre>{JSON.stringify(client.toJSON(), null, 2)}</pre>;
};
```
:::
