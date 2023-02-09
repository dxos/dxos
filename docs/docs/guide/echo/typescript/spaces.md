---
order: 2
description: DXOS Spaces
---

# Spaces

Spaces are the units of sharing and access control in ECHO. Roughly equivalent to a "collection" in a document store, a space is a logical boundary around a set of items which are to be replicated amongst a set of peer members of the space. A given peer is typically a part of many spaces at any given time.

There are several steps to establishing a space between peers:

1.  <span class="peer-a">**Peer A**</span> listens on the peer network for peers intereseted in a specific [invite code](glossary#invitation-code) it generated
2.  <span class="peer-b">**Peer B**</span> obtains the [invite code](glossary#invitation-code) and locates the listening <span class="peer-a">**Peer A**</span> via the [signaling network](glossary#signaling-service)
3.  <span class="peer-a">**Peer A**</span> and B establish a secure connection via [Diffie Hellmann](https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange) key exchange
4.  <span class="peer-a">**Peer A**</span> generates an [authorization code](glossary#authorization-code)
5.  Finally, <span class="peer-b">**Peer B**</span> must provide the [authorization code](glossary#authorization-code) to <span class="peer-a">**Peer A**</span> over the connection just established to verify the security of the channel

:::tip
If you're using `react`, DXOS provides a simple [UI flow](react) that implements generating and accepting invitations to spaces.
:::

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
