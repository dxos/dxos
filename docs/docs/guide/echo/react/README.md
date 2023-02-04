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

## Manipulating data

Before we can manipulate data, we need a [user identity](identity) and a [space](spaces).

## Further configuration

::: details Using a fallback element during initial load
A fallback element is displayed while the Client is initializing. Any component can be used, and it will be given an instance of the `client` as a prop directly. A reasonable default is available as `GenericFallback` from `@dxos/react-appkit`.
 
```tsx file=./snippets/create-client-react-with-fallback.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientProvider } from '@dxos/react-client';
import { GenericFallback } from '@dxos/appkit';

const client = new Client();

const App = () => {
  return (
    <ClientProvider fallback={GenericFallback}>
      {/* ... */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);
```
:::

::: details Passing a custom Client object to ClientProvider

```tsx file=./snippets/create-client-react-with-client.tsx#L5-
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';

const client = new Client();

const App = () => {
  return (
    <ClientProvider client={client}>
      {/* ... */}
    </ClientProvider>
  );
};

createRoot(document.body).render(<App />);
```
:::

::: details Supplying configuration without a Client

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

See [advanced scenarios](../advanced) for more configuration recipes.
