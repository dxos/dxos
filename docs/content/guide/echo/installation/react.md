---
order: 1
---

# React

```bash
npm install --save @dxos/react-client
```

::: note
If using one of the DXOS application templates via [`npm init @dxos@latest`](../../tooling/app-templates.md) this is pre-installed
:::

## Configuration

When using `react`, create a `ClientProvider` to wrap your application. This allows nested components to `useClient` and the other hooks in `@dxos/react-client`.

```tsx file=./snippets/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

const createWorker = () =>
  new SharedWorker(new URL('../shared-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-client-worker',
  });

const Component = () => {
  // Get the user to log in before a space can be obtained.
  const identity = useIdentity();
  // Get the first available space, created with the identity.
  const [space] = useSpaces();
  // Grab everything in the space.
  const objects = useQuery(space, {});
  // Show the id of the first object returned.
  return <>{objects[0]?.id}</>;
};

const App = () => (
  <ClientProvider createWorker={createWorker}>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);
```

## Manipulating data

Before manipulating data, a [user identity](../../react/identity.md) and a [space](../react/README.md) are required.

## Further configuration

:::details Using a fallback element during initial load
A fallback element is displayed while the Client is initializing. Any component can be used, and it will be given an instance of the `client` as a prop directly.

```tsx file=./snippets/create-client-react-with-fallback.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

const client = new Client();

const Fallback = () => <div>Loading...</div>;

const App = () => {
  return (
    <ClientProvider client={client} fallback={Fallback}>
      {/* ... */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);
```

:::

:::details Passing a custom Client object to ClientProvider

```tsx file=./snippets/create-client-react-with-client.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

const client = new Client();

const App = () => {
  return <ClientProvider client={client}>
    {/* ... */}
  </ClientProvider>;
};

createRoot(document.body).render(<App />);
```

:::

:::details Supplying configuration without a Client

Alternatively, a config function may be supplied instead of a client, and a client will be generated internally.

```tsx file=./snippets/create-client-react-with-config.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { Config } from '@dxos/client';
import { Dynamics, Defaults, Local } from '@dxos/config';

const App = () => {
  return (
    <ClientProvider
      config={async () => new Config(await Dynamics(), Local(), Defaults())}
    >
      {/* Your components here  */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);

```

:::

See [configuration](../../typescript/config.md) in the TypeScript guide for more configuration recipes.
