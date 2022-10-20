# HALO Application

Setting up Identity in a decentralized context is hard. HALO offers a secure protocol for exchanging user identity information with applications in a privacy-preserving manner.

The HALO Application allows users to choose from a list of secure "identities" to use when interacting with an application, and helps the application authenticate the user. It's most similar to a "wallet" or a "password manager".

## Who is it for
`Developers` enjoy the application as a transparent part of the process to obtain a user identity.

End `users` use the application to manage secure "passwordless" sign-ins to the applications they use, revoke application access, or revoke device access to their identity and user data.


## Glossary
- user: a customer of an application built by a dxos developer
- developer: customer of the dxos platform, builds apps with dxos components
- profile: a list of properties found on a user object containing their name and avatar etc
- device: a particular instance of the dxos client (a browser / profile)
- application: a client identified by a hostname

## User stories

### Essentials:
Using the app, `users` can:
- self-identify when logging into an application (choose an identity)
- create/destroy "identities"
- recover an identity from a paper key
- join a device to their HALO (incl from a CLI device)
- revoke a device access to their identity and spaces (for all applications on that device)
- revoke an application access to their identity and spaces (for all devices)

### Contacts:
- see a list of known contacts
- remove a known contact
- add a known contact by pasting an identifier or opening from a QR code
- send invitations to known contacts
- accept invitations from known contacts
- send a simple message to a known contact

### Collaboration:
- create / leave spaces
- invite others to spaces
- see the spaces the identity is a member of
- leave a space
- collaborate on a single per-space rich text document together (like a readme or scratchpad)
