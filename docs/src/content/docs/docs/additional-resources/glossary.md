---
title: Glossary
---

Identity, device, invitation and recovery terms are in HALO's [glossary](/docs/halo/resources/glossary/).

### Client

A running instance of DXOS such a command line program or a browser tab.

There can be several clients per device. Browser tabs in the same profile and at the same domain are each a client, and they share a device.

### [ECHO](/docs/echo/welcome/)

Eventually Consistent Hierarchical Object Store supporting multiple concurrent writers and latent offline writers.

### Epoch

A specific point in time when the members of a [space](#space) agree to drop or compress history older than a certain point in time. To call an epoch, peers periodically agree on a specific [snapshot](#snapshot) to refer to as the beginning of the current epoch. This mechanism allows ECHO [spaces](#space) to control their size on disk and on the wire.

### MESH

The set of peer networking technologies behind ECHO and HALO. MESH doesn't connect every pair of devices directly. It maintains a network so that all devices can reach each other, perhaps through intermediaries.

### [Object](/docs/echo/concepts/objects-relations/)

A unit of data in a [space](#space), a bag of properties and values with a type and identity.

### PWA

[Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app).

### Signaling service

A service provided by DXOS KUBEs which helps peers locate each other on the network and establish peer-to-peer connections.

### Snapshot

A flat representation of a specific state of an ECHO [space](#space). An ECHO [space](#space) is made of feeds of mutations which are collapsed into a snapshot for the purposes of catching up a peer or downloading the state of the database without the log of changes.

### [Space](/docs/echo/concepts/spaces/)

An ECHO replication domain containing objects which all the peers in the space replicate continuously.
