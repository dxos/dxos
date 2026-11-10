---
title: Glossary
---

ECHO terms, such as space, object and epoch, are in ECHO's [glossary](/docs/additional-resources/glossary/).

### Access

A member's level in a space: `pull`, `read`, `edit` or `admin`. Each level includes the ones before it. See
[Spaces and membership](/docs/halo/concepts/spaces-membership/).

### Auth method

How the guest of an [invitation](#invitation) proves it is the intended guest: `none`, `shared-secret` or
`known-public-key`.

### Authorization code

A short code the host of an [invitation](#invitation) shows and the guest types in. It travels by a different route from
the [invitation code](#invitation-code), so intercepting one is not enough to get in.

### Credential

A signed statement an [identity](#identity) holds, such as the admission of a [device](#device), a
[recovery credential](#recovery-credential) or access to a service.

### Device

A key pair that an [identity](#identity) has authorized to act for it. In a browser, each profile on each site is a
device, and its tabs share it. A computer can hold several devices. See
[Identities and devices](/docs/halo/concepts/identities-devices/).

### DID

The decentralized identifier that names an [identity](#identity), such as `did:halo:BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE`.

### Identity

A key pair that stands for one user. The client generates it; no server issues it.

### Invitation

A short-lived offer that lets a [device](#device) into an identity or a member into a space. See
[Invitations](/docs/halo/concepts/invitations/).

### Invitation code

The code the guest of an [invitation](#invitation) redeems with `join`, usually sent as a link.

### Keyhive

The access control and group encryption system HALO is built on. It represents [identities](#identity), devices and
spaces as groups, grants [access](#access) through signed delegations, and keeps each space's encryption key for its
current members. See [Spaces and membership](/docs/halo/concepts/spaces-membership/).

### Member

An [identity](#identity) admitted to a space, with an [access](#access) level.

### Membership policy

Whether a space admits new members by invitation (`invite`) or not at all (`locked`).

### Personal space

A space that every identity has and only its own devices join. It carries the user's data from device to device.

### Recovery code

A phrase of words that holds a [recovery credential](#recovery-credential)'s key. Sometimes called a paper key.

### Recovery credential

A key outside every device that can admit a new device to the identity: a [recovery code](#recovery-code), a passkey or
an OAuth account. See [Recovery and credentials](/docs/halo/concepts/recovery-credentials/).

### Space key

The value that identifies a space. Newer APIs use the space id.
