---
order: 1
dir:
  text: React Guide
  order: 3
---

# Installation

```bash
npm install --save @dxos/react-client
```

::: note
If using one of the DXOS application templates via [`npm init @dxos`](../cli/app-templates) this is pre-installed
:::

## Configuration

When using `react`, create a `ClientProvider` to wrap your application. This allows nested components to `useClient` and the other hooks in `@dxos/react-client`.

```tsx file=./snippets/create-client-react.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  ClientProvider,
  useIdentity,
  useQuery,
  useSpaces
} from '@dxos/react-client';

const Component = () => {
  // Get the user to log in before a space can be obtained.
  const identity = useIdentity({ login: true });
  // Get the first available space, created with the identity.
  const [space] = useSpaces();
  // Grab everything in the space.
  const objects = useQuery(space, {});
  // Show the id of the first object returned.
  return <>{objects[0]?.id}</>;
};

const App = () => (
  <ClientProvider>
    <Component />
  </ClientProvider>
);

createRoot(document.body).render(<App />);
```

## Manipulating data

Before manipulating data, a [user identity](identity) and a [space](spaces) are required.

## Further configuration

:::details Using a fallback element during initial load
A fallback element is displayed while the Client is initializing. Any component can be used, and it will be given an instance of the `client` as a prop directly. A reasonable default is available as `GenericFallback` from `@dxos/react-appkit`.

```tsx file=./snippets/create-client-react-with-fallback.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { GenericFallback } from '@dxos/react-appkit';

const client = new Client();

const App = () => {
  return (
    <ClientProvider client={client} fallback={GenericFallback}>
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
import { Dynamics, Defaults } from '@dxos/config';

const App = () => {
  return (
    <ClientProvider
      config={async () => new Config(Defaults(), await Dynamics())}
    >
      {/* Your components here  */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);

```

:::

See [configuration](../typescript/config) in the TypeScript guide for more configuration recipes.
