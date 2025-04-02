---
title: Introduction to HALO
sidebar:
  label: Introduction
  order: 0
---

HALO is a system of components for implementing decentralized identity designed around privacy, security, and collaboration requirements.

* The HALO SDK is part of the [DXOS client library](https://www.npmjs.com/package/@dxos/client) and provides user authentication, identity, and contact management capabilities.
* The HALO protocol supports the verification, transport, and exchange of identity information between networked peers.

## Features

* Public/private key-pair authentication mechanism integrated into ECHO
* Passwordless log in
* Local-first credentials and key storage
* Multi-device synchronization of identities, credentials, ECHO spaces

## Establishing user identity

There are a few ways a user can establish their identity (login) with DXOS on any given [device](/additional-resources/glossary#device).

1. Initializing a new HALO identity for the user from a DXOS-powered application.
2. Accepting a device invitation will synchronize the user's identity from another device.
3. Recovering an identity using a [recovery code](/additional-resources/glossary#recovery-code), sometimes referred to as paper key recovery.
4. Recovering an identity using a [passkey](https://www.passkeys.io/).

## Next steps

How to read the HALO identity in code:

* Use the [`useIdentity` hook in react](/halo/react)
* Use the [`client.halo.profile` field in TypeScript](/halo/typescript)
