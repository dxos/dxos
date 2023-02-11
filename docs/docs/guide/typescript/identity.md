---
order: 1
---

# Identity

This section describes how to obtain [HALO identity](../platform/halo) in TypeScript.

To create or join a [space](./spaces) in ECHO, the user must first [establish their identity](../platform/halo#establishing-user-identity) in the [HALO](../platform/halo) app.

## Logging in

```ts
import { Client } from "@dxos/client";

const client = new Client();

const identity = client.halo.identity;
```

The object returned is of type [`Identity`](/api/@dxos/client/interfaces/Identity).

:::apidoc[@dxos/client.Halo]{level="2"}
# Interface `Halo`

> Declared in [`packages/sdk/client/src/packlets/proxies/halo-proxy.ts`]()

TODO(burdon): Public API (move comments here).

## Properties
:::
