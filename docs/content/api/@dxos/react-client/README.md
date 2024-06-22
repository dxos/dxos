# @dxos/react-client

React client API

## Installation

```bash
pnpm i @dxos/react-client
```

## Usage

The snippet below illustrates a self-contained DXOS application that uses providers to create the client and instantiate a user profile.

```javascript

import React from 'react';
import { useClient, ClientProvider } from '@dxos/react-client';
import { createRoot } from 'react-dom/client';

const App = () => {
  const client = useClient();
  const space = useSpaces();
  return (
    <pre>{JSON.stringify(client.info())}</pre>
  );
};

const Root = () => (
  <ClientProvider>
    <App />
  </ClientProvider>
);

createRoot(document.getElementById('root')!)
  .render(<Root/>);

```

## Documentation

- [⚡️ Quick Start](https://docs.dxos.org/guide/quick-start)
- [📖 Developer Guide](https://docs.dxos.org/guide/echo/react)
- [📚 API Reference](https://docs.dxos.org/api/@dxos/react-client)

## Storybooks

The [HALO Invitation Story](./stories/halo-invitations.stories.tsx) demonstrates multiple clients (devices) joining the same HALO. [Demo video](https://user-images.githubusercontent.com/3523355/137532718-a21f1f27-9854-4c0b-831a-e9ff92feac49.mov).

The [Space Invitation Story](./stories/space-invitations.stories.tsx) demonstrates multiple clients creating and sharing spaces. [Demo video](https://user-images.githubusercontent.com/3523355/137532717-e77395dc-96f9-4e4b-8f67-e6bd026a3abe.mov).

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Talk to us on [Discord](https://dxos.org/discord)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
