---
title: Glossary
---

ECHO terms, such as space, object and epoch, are in ECHO's [glossary](/docs/additional-resources/glossary/).

### Access level

A member's level in a space: `pull`, `read`, `edit` or `admin`. Each level includes the ones before it. The API calls it
the member's `role`. See [Spaces and membership](/docs/halo/concepts/spaces-membership/).

### Auth method

How the guest of an [invitation](#invitation) proves it is the intended guest: `none`, `shared-secret` or
`known-public-key`.

### Authorization code

A short code the host of an [invitation](#invitation) shows and the guest types in. It travels by a different route from
the [invitation code](#invitation-code), so intercepting one is not enough to get in.

### Contact card

What each side of an [invitation](#invitation) gives the other: it names an identity or device and carries the keys others
need to encrypt to it and check its signatures.

### Credential

A signed statement an [identity](#identity) holds, such as the admission of a [device](#device), a
[recovery credential](#recovery-credential) or access to a service.

### Delegation

A signed statement that admits an identity, a device or a key to a group with an [access level](#access-level). A member
can delegate no more access than it holds. See [Spaces and membership](/docs/halo/concepts/spaces-membership/).

### Device

A key pair that an [identity](#identity) has authorized to act for it. In a browser, each profile on each site is a
device, and its tabs share it. A computer can hold several devices. See
[Identities and devices](/docs/halo/concepts/identities-devices/).

### DID

The decentralized identifier that names an [identity](#identity), such as `did:halo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE`.

### Group key

The key a space's current members share, which encrypts the space's changes. It changes when membership does, and `pull`
members relay data encrypted with it without reading it.

### Identity

One user, as a Keyhive group named by a [DID](#did), whose members are the user's [devices](#device). The client creates
it; no server issues it.

### Invitation

A short-lived offer that lets a [device](#device) into an identity or a member into a space. See
[Invitations](/docs/halo/concepts/invitations/).

### Invitation code

The code the guest of an [invitation](#invitation) redeems with `join`, usually sent as a link.

### Keyhive

The access control and group encryption system HALO is built on. It represents [identities](#identity), devices and
spaces as groups, grants [access](#access-level) through signed delegations, and keeps each space's encryption key for its
current members. See [Spaces and membership](/docs/halo/concepts/spaces-membership/).

### Member

An [identity](#identity) admitted to a space, with an [access](#access-level) level.

### Membership policy

Whether a space admits new members by invitation (`invite`) or not at all (`locked`).

### Personal space

A space that every identity has and only its own devices join. It carries the user's data from device to device.

### Prekey

A one-time key published in advance, so a guest can encrypt to the host of a delegated [invitation](#invitation) while the
host is offline.

### Recovery code

A phrase of words that holds a [recovery credential](#recovery-credential)'s key. Sometimes called a paper key.

### Recovery credential

A key outside every device that can admit a new device to the identity: a [recovery code](#recovery-code), a passkey or
an OAuth account. See [Recovery and credentials](/docs/halo/concepts/recovery-credentials/).

### Revocation

A signed statement that removes a member from a group. An admin can revoke anyone; another member only those it has
causal seniority over.

### Space key

The value that identifies a space. Newer APIs use the space id.
