---
order: 2
---

# HALO Identity

HALO is a system of components for implementing decentralized identity designed around privacy, security, and collaboration requirements.

- The HALO [**application**](https://halo.dxos.org) is a software wallet that contains user identities, secrets (i.e.: private keys), other credentials.
- The HALO [**SDK**](https://www.npmjs.com/package/@dxos/client) is part of the DXOS client library and provides user authentication, identity, and contact management capabilities.
- The HALO **protocol** supports the verification, transport, and exchange of identity information between networked peers.

The HALO application also acts as a secure vault where all ECHO data is physically stored on behalf of the user and their applications. Read more about [local vault topology](../platform/#local-vault-topology).

## Features

- Public/private key-pair authentication mechanism integrated into ECHO
- Passwordless log in
- Local-first credentials and key storage
- Multi-device synchronization of identities, credentials, ECHO spaces
- Paper-key identity recovery

## Establishing user identity

There are three ways a user can establish their identity (login) with HALO on any given [device](../glossary#device).

1.  Create a new identity
2.  Use an identity from another device
3.  Recover an identity using a [seed phrase](../glossary#seed-phrase)

Open <https://halo.dxos.org> and you will be guided through the options.

![HALO application](./images/halo-dark.png#dark)
![HALO application](./images/halo-light.png#light)

## Next steps

How to read the HALO identity in code:

- Use the [`useIdentity` hook in react](../react/identity)
- Use the [`client.halo.profile` field in TypeScript](../typescript/identity)
