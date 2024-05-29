---
dir:
  text: ECHO Database
  order: 4
order: 0
---

# About

ECHO (The **E**ventually **C**onsistent **H**ierarchical **O**bject store) is a peer-to-peer graph database written in TypeScript.

* Secure, P2P data replication based on [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type).
* No servers or central authority, all the data is with the clients.
* Connectivity with peers via [WebRTC](https://en.wikipedia.org/wiki/WebRTC).
* Support for multiple concurrent writers.
* Collaboration on key-value objects and text.
* Support for offline writes and conflict resolution when peers rejoin the network.

::: note Tell us what you think
Join our [Discord](https://discord.gg/eXVfryv3sW) and talk to us about the kind of database you are looking for.
:::

## Spaces

Spaces are units of sharing and access control in ECHO. They are equivalent to "collections" in a document store.

**A `space` is an instance of an ECHO database which can be replicated by a number of peers.**

A given peer is typically a part of many spaces at any given time.

There are several steps to establishing a space between peers:

1. <span class="peer-a">**Peer A**</span> listens on the peer network for peers intereseted in a specific [invite code](../glossary.md#invitation-code) it generated.
2. <span class="peer-b">**Peer B**</span> obtains the [invite code](../glossary.md#invitation-code) and locates the listening <span class="peer-a">**Peer A**</span> via the [signaling network](../glossary.md#signaling-service).
3. <span class="peer-a">**Peer A**</span> and <span class="peer-b">**Peer B**</span> establish a secure connection via [Diffie Hellmann](https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange) key exchange.
4. <span class="peer-a">**Peer A**</span> generates an [authorization code](../glossary.md#authorization-code) and sends it to <span class="peer-b">**Peer B**</span> via another safe channel (i.e.: shows a QR code).
5. Finally, <span class="peer-b">**Peer B**</span> provides the [authorization code](../glossary.md#authorization-code) back to <span class="peer-a">**Peer A**</span> over the new connection.

This verifies that the connection is secure, and the identities of peers are mutually confirmed.

::: tip Tip
If you're using `react`, DXOS provides a simple [UI flow](./react/#joining-spaces) that implements generating and accepting invitations to spaces.
:::

**Next steps:**

* Create or join a space in [TypeScript](./typescript/)
* Create or join a space in [React](./react/)

## Objects

Units of data are referred to as `objects` (like documents or rows in other databases). `Objects` always belong to a space. `Objects` can have fields with values, and weak references to other objects to form trees or graphs.

## Values

Values within an `object` are JS strings, numbers, booleans, and null, as well as objects and arrays of the same.

The top-level of a DXOS `object` is always a JS object, never a number, string, etc. Its fields starting with `@` are reserved, for example `@id` and `@meta`.

## How to use ECHO

* Install the appropriate npm package [`@dxos/client`](./installation/) or [`@dxos/react-client`](./installation/react/)
* Create a [Client](./typescript#configuration) (or a [ClientProvider](./react#cofiguration) in react)
* Set up an identity with [HALO](../halo/)
* Create or Join a [Space](#spaces)
* [Query objects](./typescript/queries.md) (in [react](./react/queries.md))
* [Create objects](./typescript/mutations.md#creating-objects) (in [react](./react/mutations.md))
* [Mutate objects](./typescript/mutations.md) (in [react](./react/mutations.md))

## ECHO and HALO

ECHO is designed to allow users to retain control over their data. ECHO is a secure storage mechanism, responsible for holding end-user data and identity information (keys, credentials, metadata, ..., etc.) in persistent browser or filesystem storage. Specific devices can be revoked from accessing user data at any time.

In order to allow multiple applications to access the same ECHO database, the user must initiate a device invitation, which synchronizes ECHO across both applications, giving them both read and write access to all of the user's data stored in their ECHO. See [Device Invitations](../halo/#device-invitations) for more information.

For Node.js applications, the ECHO database is implemented as an in-process storage engine that persists to files on disk.

## Next steps

* If using `react` see the [React guide](./react/)
* Otherwise, follow the [TypeScript guide](./typescript/)
