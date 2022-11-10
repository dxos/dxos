# @dxos/react-client

React client API

## Installation

```bash
pnpm i @dxos/react-client
```

## Usage

The snippet below illustrates a self-contained DXOS application that uses providers to create the client and instantiate a user profile.

```javascript

import { useClient, ClientProvider, ProfileInitializer } from '@dxos/react-client';
import React from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  const client = useClient();

  return (
    <pre>{JSON.stringify(client.info())}</pre>
  );
};

const Root = () => (
  <ClientProvider>
    <ProfileInitializer>
      <App />
    </ProfileInitializer>
  </ClientProvider>
);

createRoot(document.getElementById('root')!)
  .render(<Root/>);

```

## Storybooks

The [HALO Invitation Story](./stories/halo-invitations.stories.tsx) demonstrates multiple clients (devices) joining the same HALO. [Demo video](https://user-images.githubusercontent.com/3523355/137532718-a21f1f27-9854-4c0b-831a-e9ff92feac49.mov).

The [Space Invitation Story](./stories/space-invitations.stories.tsx) demonstrates multiple clients creating and sharing spaces. [Demo video](https://user-images.githubusercontent.com/3523355/137532717-e77395dc-96f9-4e4b-8f67-e6bd026a3abe.mov).

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with `#dxos`
- Tag us on twitter [`@dxos_org`](https://twitter.com/dxos_org)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](https://github.com/dxos/dxos/blob/main/CODE_OF_CONDUCT.md), the [issue guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-issues), and the [PR contribution guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md#submitting-prs). If you would like to contribute to the design and implementation of DXOS, please [start with the contributor's guide](https://github.com/dxos/dxos/blob/main/CONTRIBUTING.md).

License: [MIT](./LICENSE) Copyright 2022 © DXOS
