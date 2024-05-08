---
order: 1
---

# Identity

This section describes how to obtain [HALO identity](../halo.md) in TypeScript.

To create or join a [space](./spaces.md) in ECHO, the user must first establish a HALO identity.

## Obtaining identity

```ts{7} file=./snippets/get-identity.ts#L5-
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

```ts{7} file=./snippets/create-identity.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const identity = await client.halo.createIdentity();
})();
```

::: details Creating an identity with a display name
Pass `displayName` to `createProfile`:

```ts{8} file=./snippets/create-identity-displayname.ts#L5-
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

Before data can be manipulated, a [`space`](./spaces.md) must be obtained.
