---
title: Identity services
description: 'What EDGE does for HALO: recovery, accounts, invitations and service access.'
---

HALO identities are key pairs that devices make, and most of HALO needs no server. EDGE handles the parts that do:
recovering an identity when every device is gone, the DXOS account an identity is linked to, and access to EDGE's own
services.

## Model

**Recovery.** In a web app, the server resets a lost password, because the server holds the account. With HALO, the
keys are on the devices, so a user sets up a recovery credential while they still have a device. The credential is a
recovery code or a passkey, and HALO stores it with EDGE.

To recover, a new device asks EDGE for a challenge and signs it with the recovery key. EDGE checks the signature
against the identity's recovery credentials and admits the new device to the identity.

Recovery needs EDGE because, with every device lost, no one else holds the identity's keys to admit a new one. See
[Recovery and credentials](/docs/halo/concepts/recovery-credentials/).

**Accounts.** The Hub service keeps DXOS accounts. An identity linked to an account can use EDGE. The Hub also handles
email verification and the invitations that bring people to DXOS.

**Service access.** `Identity.grantServiceAccess` writes a credential that lets the identity use an EDGE or Hub service.
`Identity.createApiToken` mints a token. Use it when a CLI or a server has to act as the identity. Agents that run on
EDGE get identities of their own.

## Behavior

- The recovered device is a new member of the same identity, with the same DID. It syncs the identity's spaces from EDGE
  and from any other members online.
- EDGE checks credentials. By default it holds no key that can act for the identity. An identity can grant EDGE one,
  as an agent device whose key EDGE holds. See [Identities and devices](/docs/halo/concepts/identities-devices/).

## Limits

- EDGE stores recovery credentials only for identities linked to an account. For now, you create an account through
  [Composer](https://composer.space).
- Recovery needs a connection to EDGE.
