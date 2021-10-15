# @dxos/react-client

## Install

```
$ npm install @dxos/react-client
```

## Usage

```javascript
import { useClient } from '@dxos/react-client';

const Components = () => {
  const client = useClient();
  return (
    <pre>{JSON.stringify(client.info())}</pre>
  );
};
```

## Storybooks

The Party Invitation [Story](./stories/invitations.stories.tsx) demonstrates multiple clients creating and sharing parties.

https://user-images.githubusercontent.com/3523355/137532717-e77395dc-96f9-4e4b-8f67-e6bd026a3abe.mov

the HALO Invitation [Story](./stories/authentication.stories.tsx) demonstrates multiple clients (devices) joining the same HALO.

https://user-images.githubusercontent.com/3523355/137532718-a21f1f27-9854-4c0b-831a-e9ff92feac49.mov


## Contributing

PRs accepted.

## License

AGPL-3.0 © DXOS
