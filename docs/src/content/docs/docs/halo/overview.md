---
title: Overview
description: What HALO is and how its pages are organized.
welcome:
  section: HALO
  tagline: Identity for local-first apps, with keys that live on the user's devices.
  background: halo
---

HALO is identity management for local-first apps. It handles a user's identity, the devices and credentials that act
for it, and who can join a space.

In most apps, a server holds the user's account and checks a password to know who they are. A HALO **identity** is a
group of keys that the user's own devices hold, named by a [DID](/docs/halo/resources/glossary/#did). The first device
creates it, and no server issues it.

Each device signs the changes it makes with its own key. Peers check those signatures against the identity's keys,
instead of asking a server who the user is.

By default no server holds a key that can act for an identity. An identity can grant a server access to hold a key
for it, and EDGE, DXOS's always-online peer, provides that as a service.

HALO is built on [Keyhive](https://github.com/inkandswitch/keyhive), a capability-based access control and group
encryption system for local-first data. Keyhive records who may do what as signed delegations that every peer can
check. It also keeps the key that encrypts a space, for the members allowed to read it.

## The `@dxos/halo` package

The package has three namespaces:

- **Identity** creates, reads and recovers the user's identity, lists its devices, and invites a new device.
- **Invitation** drives one invitation once it exists. It covers the invitation's code, its events, and the step where
  the person joining enters the authorization code.
- **Space** creates spaces, invites people to them, and manages each member's access level.

## Ways to establish an identity on a device

You can put an identity on a device in four ways:

1. Create a new identity from the app.
2. Accept a device invitation from a device that already has the identity.
3. Recover the identity with a recovery code, sometimes called a paper key.
4. Recover the identity with a [passkey](https://www.passkeys.io/).

## How these pages relate to ECHO

ECHO stores and replicates the data in a space. HALO decides who may join it.

The [ECHO learning path](/docs/echo/learn/the-echo-object/) creates an identity in one line so it can open a space.
Its [Sharing a space](/docs/echo/learn/sharing/) page invites a second person.

The HALO learning path builds an app of its own, a [contact book](/docs/halo/learn/the-halo-identity/). The contact
book has a name, a few spaces, the people in them, a second device and a recovery code.
