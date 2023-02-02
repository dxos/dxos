---
title: Configuration
order: 1
dir:
  text: React
  order: 10
---

# Configuration

When using `react`, create a `ClientProvider` to wrap your application. This allows nested components to `useClient` and the other hooks in `@dxos/react-client`.

```tsx file=./snippets/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider, useClient } from '@dxos/react-client';

const Component = () => {
  const client = useClient();
  return <pre>{JSON.stringify(client.toJSON(), null, 2)}</pre>;
};

const App = () => (
  <ClientProvider>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);
```

A client object can also be passed in to Client provider:

```tsx file=./snippets/create-client-react-with-client.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

const client = new Client();

const App = () => {
  return (
    <ClientProvider
      client={client}
      fallback={<div>Loading</div>}
    >
      {/* ... */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);
```

Alternatively, a config function may be supplied instead of a client, and a client will be generated internally. The fallback element will be displayed while the client is being initialized.

```tsx file=./snippets/create-client-react-with-config.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { Config } from '@dxos/client';
import { Dynamics, Defaults } from '@dxos/config';

const App = () => {
  return (
    <ClientProvider
      config={async () => new Config(Defaults(), await Dynamics())}
      fallback={<div>Loading</div>}
    >
      {/* Your components here  */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);

```

See [advanced scenarios](../advanced) for more configuration recipes.