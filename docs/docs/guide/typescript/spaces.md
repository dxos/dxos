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
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // create a space:
  const space = await client.spaces.create();
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
  const spaces = client.spaces.get();
})()
```

## Creating an invitation

See [ECHO Spaces](../platform/#spaces) for a description of the way peers join spaces.

```ts file=./snippets/invite-to-space.ts#L5-
import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const client = new Client();

(async () => {
  await client.initialize();
  // ensure an identity exists
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // create a space
  const space = await client.spaces.create();
  // create an invitation to join the space
  const invitation = space.share();
  // share this code with a friend, it will be used to locate the peer and
  // establish a secure connection
  const code = InvitationEncoder.encode(invitation.get());
  // later we will pass this second authentication code to our friend over a
  // side-channel and they'll send it to us over the new connection which
  // will verify that it's secure.
  const authCode = invitation.get().authCode;
})()
```

## Accepting invitations

See [ECHO Spaces](../platform/#spaces) for a description of the way peers join spaces.

```ts file=./snippets/join-space.ts#L5-
import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client/invitations';

const client = new Client();

(async () => {
  await client.initialize();
  if (!client.halo.identity.get()) await client.halo.createIdentity();
  // friend decodes the invitation code
  const receivedInvitation = InvitationEncoder.decode('<invitation code here>');
  // accept the invitation
  const invitation = client.spaces.join(receivedInvitation);
  // verify it's secure by sending the second factor authCode
  await invitation.authenticate('<authentication code here>');
  // space joined!
  const space = client.spaces.get(invitation.get().spaceKey!);
})();
```

Having obtained a `space`, it is now possible to [query](./queries) and [mutate](./mutations) objects in that space.
