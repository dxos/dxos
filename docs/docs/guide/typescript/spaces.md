---
order: 2
description: DXOS Spaces
---

# Spaces

A `space` is an instance of an ECHO database which can be replicated by a number of peers.

This section describes how to create, join, and invite peers to [ECHO Spaces](../platform/#spaces) with the TypeScript API.

## Creating spaces

Having established an [identity](./identity), a space can be created:

```ts file=./snippets/create-space.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();
(async () => {
  await client.initialize();
  // ensure an identity exists:
  if (!client.halo.profile) await client.halo.createProfile();
  // create a space:
  const space = await client.echo.createSpace();
})();
```

## Listing spaces

Obtain a list of [Space](/api/@dxos/client/interfaces/Space) objects:

```ts file=./snippets/query-spaces.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  // get a list of all spaces
  const { value: spaces } = client.echo.querySpaces();
})()
```

## Creating an invitation

See [ECHO Spaces](../platform/#spaces) for a description of the way peers join spaces.

```ts file=./snippets/invite-to-space.ts#L5-
import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  // ensure an identity exists
  if (!client.halo.profile) await client.halo.createProfile();
  // create a space
  const space = await client.echo.createSpace();
  // create an invitation to join the space
  const { invitation } = space.createInvitation();
  if (invitation) {
    // share this code with a friend, it will be used to locate the peer and
    // establish a secure connection
    const code = InvitationEncoder.encode(invitation);

    // later we will pass this second authentication code to our friend over a
    // side-channel and they'll send it to us over the new secure connection which
    // will verify that it's secure.
    const authCode = invitation.authenticationCode;
  }
})()



```

## Accepting invitations

See [ECHO Spaces](../platform/#spaces) for a description of the way peers join spaces.

```ts file=./snippets/join-space.ts#L5-
import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.profile) await client.halo.createProfile();
  // friend decodes the invitation code
  const receivedInvitation = InvitationEncoder.decode('<invitation code here>');
  // accept the invitation
  const { authenticate, invitation } = client.echo.acceptInvitation(receivedInvitation);
  // verify it's secure by sending the second factor authCode
  await authenticate('<authentication code here>');
  // space joined!
  const space = client.echo.getSpace(invitation?.spaceKey!);
})();
```

Having obtained a `space`, it is now possible to [query](./queries) and [mutate](./mutations) objects in that space.