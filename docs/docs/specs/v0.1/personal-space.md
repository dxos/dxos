# Personal Space

The user's "home" space which roams with them across all devices. This gives developers a default place to persist state for a given identity across all devices.

# Requirements

1. There is only one personal space per identity
2. The contents of the personal space replicate to all devices of the identity by default
3. Users can reset their personal space by creating a new one to replace it

```ts

const client = new Client();

const defaultSpace            = client.spaces.default;
const nonEphemeralSpacesOnly  = client.spaces.query();
const includesEphemeralSpaces = client.spaces.query({ ephemeral: true });
const newEphemeralSpace       = client.spaces.create({ ephemeral: true }); // Cannot be shared.

```

```ts

import { Client } from '@dxos/client';

const client = new Client();

await client.initialize();

const identity = client.halo.identity.get(); // null by default

// get the personal space, creating an identity is not required
const space = client.getPersonalSpace();

// sense if a space is the personal space
const isPersonalSpace = space.isPersonalSpace;

// recreate the personal space and copy all data into the new space without history
// (old space will disappear or archive on all devices)
const newSpace = await client.createPersonalSpace();

// recreate the personal space without copying data
const newSpace = await client.createPersonalSpace({ preserveData: false });

```

```tsx

import { useSpace, useClient } from '@dxos/client';

const Component = () => {
  // called with no arguments, useSpace returns the personal space
  const space = useSpace();

  // sense if personal space
  const isPersonalSpace = space.isPersonalSpace;

  const client = useClient();
  
  const action = async () => {
    // recreate the personal space and copy all data into the new space without history
    // (old space will disappear or archive on all devices)
    const newSpace = await client.createPersonalSpace();

    // recreate the personal space without copying data
    const newSpace = await client.createPersonalSpace({ preserveData: false });
  }

  return <a onClick={action}></a>;
}

```
