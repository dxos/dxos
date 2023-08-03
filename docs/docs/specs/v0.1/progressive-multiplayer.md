# Progressive Multiplayer Store

This spec describes a new API for ECHO which does not require users to deal with identity choices before using ECHO locally. Until a new device or user needs to join the swarm, the API feels like using any regular ephemeral state container such as redux or signals, but supports persistence and credible exit out of box.

## Scenarios

1. Developers can use a reactive state container without requiring users to log in or create an identity.
2. Users can close and open their application and see state persisted
3. Developers can upgrade the state container to a multi-device or multi-player state at any time by creating an identity or using an invitation hook in react.
4. Users can inspect and manipulate their data via HALO (when those features become available)
5. Users can reset their personal space by creating a new one to replace it

## Requirements

1. There is only one personal space per identity
2. The contents of this space replicate to all devices of the identity
3. HALO must be able to inspect and manipulate the personal space
4. The personal space must be able to be reset by the user
5. HALO must be able to export and import data from the personal space to facilitate resetting and credible exit

## API

```ts

import { Client } from '@dxos/client';

const client = new Client();

await client.initialize();

// no explicit create identity step required
// await client.halo.createIdentity();

// get the personal space
const space = client.spaces.getPersonalSpace();

// sense if a space is the personal space
const isPersonalSpace = space.isPersonalSpace;

// before an explicit identity is created, sharing features throw

// throws: An identity is required before creating invitations. Call `client.halo.createIdentity()` first.
const invitation = space.createInvitation(); 

// throws: An identity is required before creating invitations. Call `client.halo.createIdentity()` first.
const deviceInvitation = client.halo.createInvitation();

```

```tsx
import { useSpace } from '@dxos/client';

const Component = () => {
  // called with no arguments, useSpace returns the personal space
  // calling useIdentity before this step is no longer required
  const space = useSpace();

  return <></>;
}

```

