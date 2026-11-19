---
title: Identity services
description: 'What EDGE does for HALO: recovery, accounts, invitations and service access.'
---

A HALO identity's keys are made on its devices, and most of HALO needs no server. EDGE handles the parts that do:
recovering an identity when every device is gone, the DXOS account an identity is linked to, and access to EDGE's own
services.

## Model

A user loses every device. Who can let a new one in? The answer starts with which keys EDGE holds.

**Keys.** By default, no server holds a key that can act for an identity. An identity can grant a server access to
hold one, and EDGE provides this as a service.

When an identity makes the grant, EDGE runs an **agent device** for it. The agent device is one of the identity's
devices, of kind `agent-managed`, and EDGE holds its key. Like any of the identity's devices, it can act for the
identity. See HALO's [Identities and devices](/docs/halo/concepts/identities-devices/).

**Recovery.** While they still have a device, a user sets up a **recovery credential**. It is a signed record that
names a recovery key, and the key comes from a recovery code or a passkey. The record is part of the identity's own
data, which replicates to EDGE.

To recover, a new device asks EDGE for a challenge and signs it with the recovery key. EDGE checks the signature
against the identity's recovery credentials. If it matches, EDGE answers with a credential that admits the new device
to the identity.

Recovery needs EDGE because, with every device lost, the user has no device left to admit the new one. EDGE can admit
it for an identity that granted it a key. See
[Recovery and credentials](/docs/halo/concepts/recovery-credentials/).

**Accounts.** The **Hub** is the EDGE service that keeps DXOS accounts. An identity linked to an account can use EDGE.
The Hub also handles email verification and the invitations that bring people to DXOS.

**Service access.** `Identity.grantServiceAccess` writes a credential that lets the identity use an EDGE or Hub service.
`Identity.createApiToken` mints a token. Use it when a CLI or a server has to act as the identity.

A SAGE agent is a different thing from an agent device. It is a model in a loop that works in a space, and it
can have an identity of its own, which EDGE creates. See SAGE's [Agents](/docs/sage/concepts/agents/).

## Behavior

- The recovered device is a new device of the same identity, and the identity keeps its DID. The device syncs the
  identity's spaces from EDGE and from any other members online.
- EDGE checks credentials. It can act for an identity only with a key that the identity granted it.

## Limits

- EDGE stores recovery credentials only for identities linked to an account. For now, you create an account through
  [Composer](https://composer.space).
- Recovery needs a connection to EDGE.
