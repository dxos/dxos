---
order: 2
description: DXOS Spaces
---

# Spaces

A `space` is an instance of an ECHO database which can be replicated by a number of peers.

This section describes how to create, join, and invite peers to [ECHO Spaces](../platform/#spaces) with the TypeScript API.

## Creating spaces

```ts file=./snippets/create-space.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

const space = await client.echo.createSpace();
```

## Querying for spaces

```ts file=./snippets/query-spaces.ts#L9-
// get a list of all spaces
const { value: spaces } = client.echo.querySpaces();
```

## Creating an invitation

```ts file=./snippets/invite-to-space.ts#L5-
import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

const space = await client.echo.createSpace();

// create an invitation to join the space
const { invitation } = space.createInvitation();

// share this code with a friend, it will be used to locate the peer and
// establish a secure connection
// TODO: ignore the exclamation mark
const code = InvitationEncoder.encode(invitation!);

// later we will pass this second authentication code to our friend over a
// side-channel and they'll send it to us over the new secure connection which
// will verify that it's secure.
// TODO: ignore the exclamation mark
const authCode = invitation?.authenticationCode!;
```

## Accepting invitations

```ts file=./snippets/join-space.ts#L5-
import { Client, InvitationEncoder } from '@dxos/client';

const client = new Client();

// friend decodes the invitation code
const receivedInvitation = InvitationEncoder.decode('<invitation code here>');

// accept the invitation
const { authenticate } = client.echo.acceptInvitation(receivedInvitation);

// verify it's secure by sending the second factor authCode from above
await authenticate('<authentication code here>');

// space joined!
const { value: spaces } = await client.echo.querySpaces();
```
