---
order: 1
---

# TypeScript

To create or join a [space](../echo/typescript/README.md) in ECHO, the user must first establish a [HALO identity](../halo/). This can be done by creating a **new identity** or accepting a **device join invitation**.

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

```ts file=./snippets-typescript/device-join.ts#L5-L24
import { Client } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client-protocol';

/** Accepts a device join invitation by prompting the user for:
 *    - invitation code
 *    - authentication code */
const acceptInvitation = async (
  client: Client,
  deviceInvitationCode: string,
) => {
  const decodedInvitation = InvitationEncoder.decode(deviceInvitationCode);
  const invitationResult = client.halo.join(decodedInvitation);

  if (decodedInvitation.authCode) {
    await invitationResult.authenticate(decodedInvitation.authCode);
  } else {
    const authCode = '123456'; // Take this as input from the user.
    await invitationResult.authenticate(authCode);
  }
};
```

::: tip

* Your [client](../../api/@dxos/client) instance needs to be [configured](../echo/typescript/config.md) correctly to talk to a [signaling service](../glossary.md#signaling-service).
* If accepting a device join invitation from a UI application using the [shell](../dxos-ui/shell/) (e.g. [Composer](../../composer/)), you will only be presented with the `authCode` after the call to `halo.join` has been made.
  :::

::: details Retrieving a device invitation code from an invitation URL

```ts file=./snippets-typescript/device-join.ts#L26-L37
/** Extracts device invitation code from a URL or string. */
const extractDeviceInvitationCode = (encoded: string) => {
  if (encoded.startsWith('http')) {
    const searchParams = new URLSearchParams(
      encoded.substring(encoded.lastIndexOf('?')),
    );

    return searchParams.get('deviceInvitationCode') ?? null;
  }

  return encoded;
};
```

:::
