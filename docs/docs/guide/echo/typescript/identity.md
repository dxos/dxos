---
order: 1
---

# HALO Identity

In order to support multiple concurrent writers, ECHO mutations are recorded in append-only feeds that preserve the identity of all the writers. This makes it possible to resolve conflicts and implement powerful features like undo and time travel.

A HALO identity allows users to authenticate using asymmetric key cryptography without the use of passwords.

To create or join a [space](spaces) in ECHO, the user must first [establish their identity](../halo) in the [HALO](halo) app.

:::note
All data and identity information is stored in browser local storage on a domain separate from the application's. This enables end-user privacy and data sovereignty. Read more about the [vault topology](./#local-vault-topology).
:::

For react usage, see the [react guide](./react/identity.md).

## Logging in

```ts
import { Client } from "@dxos/client";

const client = new Client();

const identity = client.halo.profile;
```

The object returned is of type [`Profile`](/api/@dxos/client/interfaces/Profile).

:::apidoc[@dxos/client.Halo]{level=2}
## Interface `Halo`

> Declared in [`packages/sdk/client/src/packlets/proxies/halo-proxy.ts`]()

TODO(burdon): Public API (move comments here).

### Properties
:::
