---
order: 1
---

# Identity

This section describes how to obtain [HALO identity](../platform/halo) in TypeScript.

To create or join a [space](./spaces) in ECHO, the user must first establish a HALO identity.

## Obtaining identity

```ts{7} file=./snippets/get-identity.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const identity = client.halo.profile;
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
  const identity = await client.halo.createProfile();
})();
```

::: details Creating an identity with a display name
Pass `displayName` to `createProfile`:

```ts{8} file=./snippets/create-identity-displayname.ts#L5-
import { Client } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const identity = await client.halo.createProfile({
    displayName: 'Alice'
  });
})();
```

:::

::: details Creating an identity with a Seed Phrase
Use `generateSeedPhrase` to get a [Seed Phrase](../glossary#seed-phrase):

```ts{7,9} file=./snippets/create-identity-seedphrase.ts#L5-
import { Client, generateSeedPhrase } from '@dxos/client';

const client = new Client();

(async () => {
  await client.initialize();
  const seedphrase = generateSeedPhrase();
  const identity = await client.halo.createProfile({
    seedphrase
  });
  console.log(`Don't lose this recovery key: ${seedphrase}`);
})();
```

:::

Before data can be manipulated, a [`space`](./spaces) must be obtained.
