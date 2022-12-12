---
description: Using ECHO with React
---

# Usage with React

Create a `Client` and use it with `ClientProvider` to allow nested components to use `useClient` and the other hooks available in `@dxos/react-client`.

```tsx file=./snippets/create-client-react.tsx#L5-
import React from 'react';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

const client = new Client();

const App = () => {
  return (
    <ClientProvider client={client}>
      {/* Your components can useClient() here  */}
    </ClientProvider>
  );
};
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

## useClient

## useSpace

## useSelection
