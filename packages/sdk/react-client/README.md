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

[Party Invitation Story](./stories/invitations.stories.tsx)

https://user-images.githubusercontent.com/3523355/137529670-7ab9a4bd-3b89-499f-88a3-75853b87fa5e.mov

[Device Invitation Story](./stories/authentication.stories.tsx)

https://user-images.githubusercontent.com/3523355/137529677-97e58a3a-552b-43a2-86bb-c4bdfd4df177.mov

## Contributing

PRs accepted.

## License

AGPL-3.0 © DXOS
