---
title: Welcome
description: What HALO is and how its pages are organized.
welcome:
  section: HALO
  tagline: Identity for local-first apps, with keys that live on the user's devices.
  background: halo
---

HALO is identity management for local-first apps. It handles a user's identity, the devices and credentials that act for it, and who can join a space.

An identity in HALO is a key pair. The client generates it on the device, and no server issues it or holds the private key. The identity signs the user's changes, and peers check those signatures instead of asking a server who the user is.

HALO is built on [Keyhive](https://github.com/inkandswitch/keyhive), a capability-based access control and group encryption system for local-first data. Keyhive records who may do what as signed delegations that every peer can check, and it keeps the keys that encrypt a space for its current members.

## The `@dxos/halo` package

The package has three namespaces:

- **Identity** creates, reads and recovers the user's identity, lists its devices, and invites a new device.
- **Invitation** drives one invitation once it exists: its code, its events, and the step where the guest enters the authorization code.
- **Space** creates spaces, invites people to them, and manages each member's role.

## Ways to establish an identity on a device

1. Create a new identity from the app.
2. Accept a device invitation from a device that already has the identity.
3. Recover the identity with a recovery code, sometimes called a paper key.
4. Recover the identity with a [passkey](https://www.passkeys.io/).

## How these pages relate to ECHO

The [ECHO learning path](/docs/echo/learn/installation/) creates an identity in one line so it can open a space. The HALO learning path starts from that app and adds a second device, then a second person, then recovery.

To read the identity in a React app today, see [React](/docs/halo/react/).
