# Progressive Multiplayer Store

A new API for ECHO which does not require users to deal with identity choices before using ECHO locally. Until a new device or user needs to join the swarm, the API feels like using any regular ephemeral state container such as redux or signals, but supports persistence and credible exit out of box.

## Scenarios

1. Instant, Reactive state container

    Developers can use a reactive state container without requiring users to log in or create an identity. The container is valid immediately (synchronously) when created just like redux.

2. Persistence

    Users can close and open their application and see state persisted.

3. Progressive multiplayer

    Developers can upgrade the state container (without data loss) to a multi-device or multi-player state at any time by creating an identity or using an invitation hook in react.

## Glossary
Null identity - the default identity created by the client when no identity is explicitly created by the user.

## TypeScript API

```ts

import { Client } from '@dxos/client';

const client = new Client();

await client.initialize();

// no explicit create identity step required
// await client.halo.createIdentity();

// by default identity.get() returns null
const identity = client.halo.identity.get();
// > null

// creating a space works without identity
const space = client.createSpace();

// before an explicit identity is created, sharing features throw

const invitation = space.createInvitation(); 
// > throws: An identity is required before creating invitations. Call `client.halo.createIdentity()` first.

const deviceInvitation = client.halo.createInvitation();
// > throws: An identity is required before creating invitations. Call `client.halo.createIdentity()` first.

```

## React API

```tsx

import { useSpaces, useShell } from '@dxos/react-client';

const Component = () => {

  // calling useIdentity before this step is no longer required
  const spaces = useSpaces();

  // there will always be at least one space (personal space)
  const [space] = spaces;

  // using an identity will create one by default via shell panels
  const identity = useIdentity();

  // prevent automatic identity creation and read current identity
  const identity2 = useIdentity({ login: false }); // null by default
  
  // grab a shell to invoke invite flows. requires ClientProvider (with ShellProvider inside)
  const shell = useShell();

  const action = async () => {
    // invite a new user to the space with shell panel flow
    // if an identity doesn't exist, the shell will create one
    const newMembers = await shell.inviteMembers(space);

    // invite another device with shell panel flow
    const newDevice = await shell.inviteDevice();

    // invoke the equivalent of HaloButton
    shell.open();
  }

  return <a onClick={action}></a>;
}

```