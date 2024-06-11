---
order: 1
---

# TypeScript
To create or join a [space](../echo/typescript/README.md) in ECHO, the user must first establish a [HALO identity](../halo/). This can be done by creating a __new identity__ or accepting a __device join invitation__.

## Obtaining identity

```ts{7} file=./snippets-typescript/get-identity.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const identity = client.halo.identity.get();
})();
```

The object returned is of type [`Identity`](/api/@dxos/client/interfaces/Identity).

## Creating an identity

Create a new identity:

```ts{7} file=./snippets-typescript/create-identity.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const identity = await client.halo.createIdentity();
})();
```

::: details Creating an identity with a display name
Pass `displayName` to `createProfile`:

```ts{8} file=./snippets-typescript/create-identity-displayname.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const identity = await client.halo.createIdentity({
    displayName: 'Alice'
  });
})();
```

:::

Before data can be manipulated, a [`space`](../echo/typescript/README.md) must be obtained.

## Receiving a device join invitation
We often want to add a device to the same [HALO identity](../halo/).
You can accept a device join invitation by providing the invitation code and the auth code to the dxos client.
This example demonstrates how to accept a device join invitation in a console application.
A device join invitation can be obtained from [the shell](../halo/#shell) or generated in typescript from an existing identity.

```ts{7}
import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client-protocol';
import * as readlineSync from 'readline-sync';

/** Extracts device invitation code from a URL or string. */
const getDeviceInvitationCode = (encoded: string): string | null => {
  if (encoded.startsWith('http')) {
    const searchParams = new URLSearchParams(encoded.substring(encoded.lastIndexOf('?')));
    return searchParams.get('deviceInvitationCode') ?? null;
  }

  return encoded;
};

/** Accepts a device join invitation by prompting the user for:
 *    - invitation code
 *    - authentication code */
const acceptInvitation = async (client: Client) => {
  const encodedInvitation = readlineSync.question('Please enter an invitation: ');
  const deviceInvitationCode = getDeviceInvitationCode(encodedInvitation);

  if (!deviceInvitationCode) {
    console.error('Invalid invitation code');
    return;
  }

  const decodedInvitation = InvitationEncoder.decode(deviceInvitationCode);
  const invitationResult = client.halo.join(decodedInvitation);

  if (decodedInvitation.authCode) {
    await invitationResult.authenticate(decodedInvitation.authCode);
  } else {
    const authCode = readlineSync.question('Please enter the auth code: ');
    await invitationResult.authenticate(authCode);
  }
};
```

::: tip
- `readline-sync` is used in this example to read input from the console. You can use any other method to read input.
- Your [client](../../api/@dxos/client) instance needs to be [configured](../echo/typescript/config) correctly to talk to a [signalling service](../glossary#signaling-service).
:::
