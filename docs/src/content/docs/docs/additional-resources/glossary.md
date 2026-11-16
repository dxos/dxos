---
title: Glossary
---

Identity, device, invitation and recovery terms are in HALO's [glossary](/docs/halo/resources/glossary/).

### [Branch](/docs/echo/concepts/changes/#branches)

A separate line of changes to an object and the objects it references, merged into main when it is ready. A [feed](#feed) has branches of its own, for items appended to it.

### Client

A running instance of DXOS such a command line program or a browser tab.

There can be several clients per device. Browser tabs in the same profile and at the same domain are each a client, and they share a device.

### Content version

A string field that names the format of data an object stores without ECHO parsing it, such as a drawing's shapes. A content [migration](#migration) upgrades the data from one format to the next.

### [DXN](/docs/echo/concepts/references/)

A name for a resource that is not an object, most often a [type](#type): `dxn:com.example.type.person:0.1.0`.

### [ECHO](/docs/echo/overview/)

Eventually Consistent Hierarchical Object Store supporting multiple concurrent writers and latent offline writers.

### Epoch

A specific point in time when the members of a [space](#space) agree to drop or compress history older than a certain point in time. To call an epoch, peers periodically agree on a specific [snapshot](#snapshot) to refer to as the beginning of the current epoch. This mechanism allows ECHO [spaces](#space) to control their size on disk and on the wire.

### [Feed](/docs/echo/concepts/feeds/)

An append log of ECHO objects, such as the messages of a chat, stored apart from the space's objects and organized as a tree of branches.

### Hypergraph

Every [space](#space) a device holds, as one graph. It queries across spaces, finds a space's database by id, and holds the [registry](#registry).

### [MESH](/docs/mesh/overview/)

The set of peer networking technologies behind ECHO and HALO. MESH doesn't connect every pair of devices directly. It maintains a network so that all devices can reach each other, perhaps through intermediaries. Its own terms are in the [MESH glossary](/docs/mesh/resources/glossary/).

### [Migration](/docs/echo/concepts/types/#versions-and-migrations)

A function that moves objects from one version of a [type](#type) to another, renames a type, or upgrades a [content version](#content-version).

### [Object](/docs/echo/concepts/objects-relations/)

A unit of data in a [space](#space), a bag of properties and values with a type and identity.

### PWA

[Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app).

### [Reference](/docs/echo/concepts/references/)

A field whose value names another entity by its URI, and loads the target only when read.

### Registry

The types and objects an app registers in code, held in memory by the [Hypergraph](#hypergraph). A query without a source searches it along with the database.

### [Relation](/docs/echo/concepts/objects-relations/)

An entity that joins a source and a target, and can have fields of its own.

### Scope

A source a query reads from: a [space](#space), the [registry](#registry), or a [feed](#feed).

### Signaling service

The service that introduces peers to each other so they can open direct connections. EDGE runs it. See
[Signaling and discovery](/docs/mesh/concepts/signaling/).

### Snapshot

A flat representation of a specific state of an ECHO [space](#space). An ECHO [space](#space) is made of feeds of mutations which are collapsed into a snapshot for the purposes of catching up a peer or downloading the state of the database without the log of changes.

### [Space](/docs/echo/concepts/spaces/)

An ECHO replication domain containing objects which all the peers in the space replicate continuously.

### [Type](/docs/echo/concepts/types/)

An Effect Schema with a typename and a version, which every [object](#object) and [relation](#relation) names.
