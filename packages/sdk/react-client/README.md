# @dxos/react-client

## Install

```bash
git clone git@github.com:dxos/protocols.git
cd protocols
rush update && rush build

cd packages/sdk/demos
rushx book
```

## Usage

```javascript
import { useClient, ClientInitializer, ProfileInitializer } from '@dxos/react-client';
import React from 'react';
import ReactDOM from 'react-dom';

const Root = () => {
  const client = useClient();

  return (
    <pre>{JSON.stringify(client.info())}</pre>
  );
};

ReactDOM.render(
  <ClientInitializer>
    <ProfileInitializer>
      <Root />
    </ProfileInitializer>
  </ClientInitializer>,
  document.getElementById('root')
);
```

## Storybooks

The [HALO Invitation Story](./stories/halo-invitations.stories.tsx) demonstrates multiple clients (devices) joining the same HALO.

https://user-images.githubusercontent.com/3523355/137532718-a21f1f27-9854-4c0b-831a-e9ff92feac49.mov

The [Party Invitation Story](./stories/party-invitations.stories.tsx) demonstrates multiple clients creating and sharing parties.

https://user-images.githubusercontent.com/3523355/137532717-e77395dc-96f9-4e4b-8f67-e6bd026a3abe.mov


## Contributing

PRs accepted.

## License

AGPL-3.0 © DXOS
