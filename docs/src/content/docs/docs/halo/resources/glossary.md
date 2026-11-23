---
title: Glossary
---

ECHO terms, such as object and epoch, are in ECHO's [glossary](/docs/echo/resources/glossary/).

### [Access level](/docs/halo/concepts/spaces-membership/)

An access level is a member's level in a space: `pull`, `read`, `edit` or `admin`. Each level includes the ones before
it. The API calls it the member's `role`.

### Agent device

An agent device is a [device](#device) of an identity whose key [EDGE](#edge) holds. Its kind is `agent-managed`. An
identity has one only if it grants EDGE that access. It signs the credential that admits a recovered device. See
[Identities and devices](/docs/halo/concepts/identities-devices/).

### Auth method

An auth method is how the [guest](#guest) of an [invitation](#invitation) proves it is the intended guest: `none`,
`shared-secret` or `known-public-key`.

### Authorization code

An authorization code is a short code that the [host](#host) of an [invitation](#invitation) shows and the
[guest](#guest) types in. It travels by a different route from the [invitation code](#invitation-code), so
intercepting one is not enough to get in.

### Causal seniority

Causal seniority is what a member has over the members whose [delegation](#delegation) depends on its own, because it
admitted them or admitted whoever did. A member that is not an admin can revoke only those members.

### [Contact](/docs/halo/learn/your-contacts/)

A contact is anyone who shares a space with you. The learning path's contact book lists contacts by merging each
space's [members](#member) by [DID](#did).

### Contact card

A contact card is what each side of an [invitation](#invitation) gives the other. It names an identity or device and
carries the keys others need to encrypt to it and check its signatures.

### Credential

A credential is a signed statement that an [identity](#identity) holds, such as the admission of a [device](#device),
a [recovery credential](#recovery-credential) or access to a service.

### Delegation

A delegation is a signed statement that admits an identity, a device or a key to a [group](#group). In a space it
carries an [access level](#access-level). A member can delegate no more access than it holds. See
[Spaces and membership](/docs/halo/concepts/spaces-membership/).

### [Device](/docs/halo/concepts/identities-devices/)

A device is one client storage with a device key of its own, which an [identity](#identity) has admitted as a
[member](#member). In a browser, each profile on each site is a device, and its tabs share it. A computer can hold
several devices.

### DID

A DID is the decentralized identifier that names an [identity](#identity), such as
`did:halo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE`.

### EDGE

EDGE is DXOS's always-online peer. For HALO it relays invitations, replicates spaces and takes part in recovery. See
EDGE's [Overview](/docs/edge/overview/).

### [Flow](/docs/halo/api/invitation/)

A flow is one side's handle on an [invitation](#invitation) in progress, an `Invitation.Flow`. The [host](#host) and
the [guest](#guest) each hold one.

### Group

A group is Keyhive's unit of membership. It is a set of [members](#member), each admitted by a
[delegation](#delegation). An [identity](#identity) is a group of keys, and a space is a group of identities.

### Group key

A group key is the key that encrypts a space's changes. The members with `read` access or more hold it, and it
changes when membership does. A `pull` member relays data encrypted with it without reading it.

### Guest

A guest is the device that redeems an [invitation](#invitation) with `join`.

### Host

A host is the device that starts an [invitation](#invitation) with `share`, and admits the [guest](#guest).

### Hub

Hub is the [EDGE](#edge) service that keeps DXOS accounts. See
[Identity services](/docs/edge/concepts/identity-services/).

### Identity

An identity is one user, as a Keyhive [group](#group) named by a [DID](#did). Its members are the keys of the user's
[devices](#device) and the user's [recovery keys](#recovery-key). A device creates it, and no server issues it.

### Invitation

An invitation is a short-lived offer that lets a [device](#device) into an identity or a member into a space. See
[Invitations](/docs/halo/concepts/invitations/).

### Invitation code

An invitation code is the code that the [guest](#guest) of an [invitation](#invitation) redeems with `join`. The host
usually sends it as a link.

### Keyhive

Keyhive is the access control and group encryption system that HALO is built on. It represents
[identities](#identity) and spaces as [groups](#group), grants [access levels](#access-level) through signed
delegations, and keeps each space's [group key](#group-key) for the members allowed to read the space. See
[Spaces and membership](/docs/halo/concepts/spaces-membership/).

### Lookup key

A lookup key is a public value that names one [recovery credential](#recovery-credential). You revoke a recovery
credential by its lookup key, and a recovering device sends it to say which credential it is answering to.

### Member

A member is a key or an identity that a [group](#group) has admitted. An identity's members are keys. A space's
members are identities, each with an [access level](#access-level).

### Membership policy

A membership policy says whether a space admits new members. `invite` admits them by invitation, and `locked` admits
no one new.

### Prekey

A prekey is a one-time key published in advance, so a guest can encrypt to the host of a delegated
[invitation](#invitation) while the host is offline.

### Profile

A profile is an [identity](#identity)'s display name and any other data an app adds, such as an avatar. Everyone who
shares a space with the identity sees it.

### Recovery code

A recovery code is a phrase of twelve words that a [recovery key](#recovery-key) is made from. It is sometimes called
a paper key.

### Recovery credential

A recovery credential is the signed record that registers a [recovery key](#recovery-key) with an identity. It carries
the key's kind, a label, a [lookup key](#lookup-key) and whether it has been revoked. See
[Recovery and credentials](/docs/halo/concepts/recovery-credentials/).

### Recovery key

A recovery key is a key kept off every device, which gets an identity onto a new device when its devices are lost. It
lives in a [recovery code](#recovery-code), a passkey or an OAuth account.

### Revocation

A revocation is a signed statement that removes a member from a [group](#group). An admin can revoke anyone. Another
member can revoke only those it has [causal seniority](#causal-seniority) over.

### [Space](/docs/halo/concepts/spaces-membership/)

A space is a group of identities that replicate the same data. HALO decides who its [members](#member) are, and ECHO
keeps a database in it.

### Space key

A space key is the value that identifies a space. Newer APIs use the space id.
