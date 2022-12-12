---
order: 4
description: DXOS Spaces
---

# Spaces

Spaces are the unit of sharing and access control in ECHO. Roughly equivalent to a "collection" in a document store, a space is a logical boundary around a set of items which are to be replicated amongst a set of peer members of the space. A given peer is typically a part of many spaces at any given time.

There are several steps to establishing a space between peers:

1.  Peer A listens on the peer network for peers intereseted in a specific invite code it generated
2.  Peer B obtains the invite code and locates the listening peer A via the signaling network
3.  Peer A and B establish a secure connection via Diffie Hellmann key exchange
4.  Peer A decides on a secret PIN code
5.  To complete the connection, Peer B must provide the PIN code to Peer A over the secure connection

After a space with a peer is established, the peer's public key becomes "known" to the user's HALO and subsequent mutual spaces are easier to negotiate.

## Creating spaces

```ts file=./snippets/create-space.ts#L5-
import { Client } from "@dxos/client";

const client = new Client();

const space = await client.echo.createSpace();
```

## Querying for spaces
```ts file=./snippets/query-spaces.ts#L5-
```

## Creating an invitation

```ts file=./snippets/invite-to-space.ts#L5-
import { Client, InvitationEncoder } from "@dxos/client";

const client = new Client();

const space = await client.echo.createSpace();

// create an invitation to join the space
const { invitation } = space.createInvitation();

// share this code with a friend, it will be used to locate the peer and
// establish a secure connection 
//TODO: ignore the exclamation mark
const code = InvitationEncoder.encode(invitation!);

// later we will pass this second authentication code to our friend over a
// side-channel and they'll send it to us over the new secure connection which
// will verify that it's secure.
//TODO: ignore the exclamation mark
const authCode = invitation?.authenticationCode!;
```

## Accepting invitations

```ts file=./snippets/join-space.ts#L5-
import { Client, InvitationEncoder } from "@dxos/client";

const client = new Client();

// friend decodes the invitation code
const receivedInvitation = InvitationEncoder.decode("<invitation code here>");

// accept the invitation
const { authenticate } = client.echo.acceptInvitation(receivedInvitation);

// verify it's secure by sending the second factor authCode from above
await authenticate("<authentication code here>");

// space joined!
const { value: spaces } = await client.echo.querySpaces();
```
