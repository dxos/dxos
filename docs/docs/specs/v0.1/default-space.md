# Default Space

The user's "home" space which roams with them across all devices. This gives developers a default place to persist state for a given identity across all devices.

# Requirements

1. There is only one default space per identity
2. The contents of the default space replicate to all devices of the identity by default

```ts

import { Client } from '@dxos/client';

const client = new Client();

await client.initialize();

const identity = client.halo.identity.get(); // null by default

// get the default space, creating an identity is not required
const space = client.spaces.default;

// sense if a space is the default space
const isDefault = space === client.spaces.default;

```

```tsx

import { useSpace, useClient } from '@dxos/client';

const Component = () => {
  // called with no arguments, useSpace returns the default space
  const space = useSpace();

  return <></>;
}

```
