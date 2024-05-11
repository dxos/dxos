---
order: 11
---

# Glossary

### Authorization Code

A second factor provided to the invited member by the inviter to verify their identity when joining a [space](#space).

### Client

Each browser tab running DXOS is a client. Thus there are multiple clients per [device](#device).

### Device

A running instance of the DXOS `Client` represents a device on the network. Every browser profile acts as a device. A CLI application is it's own device. HALO replicates identity and credential information across devices securely and automatically and supports device revocation.

### Device

A combination of machine and browser which are connected to a DXOS [identity](#identity). So you can have multiple "devices" on the same computer, depending on how many browsers you have.

### [ECHO](./echo/)

Eventually Consistent Hierarchical Object Store supporting multiple concurrent writers and latent offline writers.

### Epoch

A specific point in time when the members of a [space](#space) agree to drop or compress history older than a certain point in time. To call an epoch, peers periodically agree on a specific [snapshot](#snapshot) to refer to as the beginning of the current epoch. This mechanism allows ECHO [spaces](#space) to control their size on disk and on the wire.

### [HALO](./halo/)

A protocol, application, and SDK for managing a decentralized user identity for end users and developers.

### [Identity](./halo/)

Represents an agent or actor in the system.

### Invitation Code

A special generated code or URL containing one which is used for peers to identify each other when joining a [space](#space).

### MESH

The set of peer networking technologies behind ECHO and HALO. MESH doesn't create a direct connection between each [device](#Device), but maintains a network so that all devices can reach each other, perhaps through intermediaries.

### [Object](./echo/#objects)

A unit of data in a [space](#space), a bag of properties and values with a type and identity.

### PWA

[Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app).

### Seed Phrase

Also known as a paper key. A string of values that make it possible to recover an identity in case of a lost device.

### [Shell](./halo/#shell)

The shell implements a few generic UI flows for managing spaces, membership, and identity. The shell can be invoked by the dxos client API and is rendered in an iframe, minimizing impact to the consuming application.

### Signaling service

A service provided by DXOS KUBEs which helps peers locate each other on the network and establish peer-to-peer connections.

### Snapshot

A flat representation of a specific state of an ECHO [space](#space). An ECHO [space](#space) is made of feeds of mutations which are collapsed into a snapshot for the purposes of catching up a peer or downloading the state of the database without the log of changes.

### [Space](./echo/#spaces)

An ECHO replication domain containing objects which all the peers in the space replicate continuously.

### Space Key

A value identifying a particular [space](#space).
