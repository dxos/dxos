---
order: 1
---

# Identity

This section describes how to obtain [HALO identity](../platform/halo) in TypeScript.

To create or join a [space](./spaces) in ECHO, the user must first [establish their identity](../platform/halo#establishing-user-identity) in the [HALO](../platform/halo) app.

## Logging in

```ts file=./snippets/get-identity.ts#L5-
import { Client } from "@dxos/client";

const client = new Client();

const identity = client.halo.identity;
```

The object returned is of type [`Identity`](/api/@dxos/client/interfaces/Identity).

## Creating an identity
Create a new identity:
```ts file=./snippets/create-identity.ts#L5-

```
::: details Creating an identity with a display name
Pass `displayName` to `createProfile`:
```ts file=./snippets/create-identity-displayname.ts#L5-
```
:::

::: details Creating an identity with a Seed Phrase
Use `generateSeedPhrase`:
```ts file=./snippets/create-identity-seedphrase.ts#L5-
```
:::



