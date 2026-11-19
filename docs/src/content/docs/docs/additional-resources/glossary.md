---
title: Glossary
---

Identity, device, member, invitation and recovery terms are in HALO's [glossary](/docs/halo/resources/glossary/).

### [Aggregate](/docs/echo/api/query/#aggregate-results)

An aggregate is a query step that returns values computed from the results, such as a count, a sum or a set of groups,
in place of the results themselves.

### [Annotation](/docs/echo/api/annotation/)

An annotation is a typed value attached to a schema, a field or an object. It says what the fields alone do not, such
as which field labels an object.

### [Blob](/docs/echo/api/blob/)

A blob is an object that records the hash, size and type of some bytes, such as an image, and where the bytes are.

### [Blob backend](/docs/echo/api/blob/#store-a-blob)

A blob backend is a store for a [blob](#blob)'s bytes. The `inline` backend keeps the bytes in the blob object, and
the `edge` backend uploads them to EDGE.

### [Branch](/docs/echo/concepts/changes/#branches)

A branch is a separate line of changes to an object and the objects it references, merged into main when it is ready. A [feed](#feed) has branches of its own, for items appended to it.

### [Change](/docs/echo/concepts/changes/)

A change is one write to an object, as its history records it. It carries the device that made it, the time and the
[heads](#heads) of the document after it.

### Client

A client is a running instance of DXOS, such as a command line program or a browser tab.

There can be several clients per device. Browser tabs in the same profile and at the same domain are each a client, and they share a device.

A client keeps in memory only the objects it has loaded. The device's storage holds the rest.

### Content version

A content version is a string field that names the format of data an object stores without ECHO parsing it, such as a drawing's shapes. A content [migration](#migration) upgrades the data from one format to the next.

### [Cursor](/docs/echo/concepts/feeds/)

A cursor is a mark on one item of a [feed](#feed). A reader resumes after it and reads only what is new.

### [DXN](/docs/echo/concepts/references/)

A DXN is a [URI](#uri) that names a resource by a dotted name and an optional version, most often a
[type](#type): `dxn:com.example.type.person:0.1.0`. A DXN can end in `#` and a [mnemonic](#mnemonic), which picks one
object out of several that share a [registry key](#registry-key).

### [ECHO](/docs/echo/overview/)

ECHO is the Eventually Consistent Hierarchical Object Store. It supports multiple concurrent writers and latent offline writers.

### [EID](/docs/echo/concepts/references/)

An EID is a [URI](#uri) with the `echo:` scheme that addresses an object or a space. The local form,
`echo:///<objectId>`, means "in this space". The qualified form, `echo://<spaceId>/<objectId>`, names the space too.

### [Entity](/docs/echo/concepts/objects-relations/)

An entity is an [object](#object) or a [relation](#relation). Queries, references and metadata work the same way for
both, so the docs say "entity" where a sentence holds for either.

### Epoch

An epoch is a point at which a [space](#space) starts from a new root document, which every [peer](#peer) then
adopts. An epoch can leave out the history before it, which lets a space control its size on disk and on the wire. A
removed object stays in the change history until the next epoch.

### [Feed](/docs/echo/concepts/feeds/)

A feed is an append log of ECHO objects, such as the messages of a chat. It is stored apart from the space's objects and organized as a tree of branches.

### [Filter](/docs/echo/api/filter/)

A filter is a predicate that says which entities match, by type, field values, text or time.

### Foreign key

A foreign key is the id an [entity](#entity) has in another system, stored in its [metadata](#metadata) as a `source`
and an `id`. A sync looks a record up by its foreign key, so the record does not enter the graph twice. See
[Filter](/docs/echo/api/filter/#match-by-foreign-key).

### Heads

Heads are the ids of the latest changes in a document. Together they name one version of the document, so
`Obj.getVersion` takes them to read an object as it was. See [Changes and branches](/docs/echo/concepts/changes/#history).

### Hypergraph

The Hypergraph is every [space](#space) a device holds, as one graph. It queries across spaces, finds a space's database by id, and holds the [registry](#registry).

### Live

A live object or query shows the latest state and notifies its subscribers when that state changes. A
[snapshot](#snapshot) is the opposite. See [The ECHO object](/docs/echo/learn/the-echo-object/).

### [Managed field](/docs/echo/concepts/objects-relations/)

A managed field is a field that ECHO keeps for every [entity](#entity), beside the fields its type declares. The
managed fields are the id, the type, the [metadata](#metadata), the label, the parent and the deleted marker.

### [MESH](/docs/mesh/overview/)

MESH is the set of peer networking technologies behind ECHO and HALO. MESH doesn't connect every pair of devices directly. It maintains a network so that all devices can reach each other, perhaps through intermediaries. Its own terms are in the [MESH glossary](/docs/mesh/resources/glossary/).

### [Metadata](/docs/echo/api/obj/#meta-tags-labels-and-parents)

Metadata is the data ECHO keeps about an [entity](#entity) and not in its fields: its [foreign keys](#foreign-key),
its [tags](#tag) and the annotations set on it. `Obj.getMeta` reads it, and the `Obj.Meta` key sets it in `Obj.make`.

### [Migration](/docs/echo/concepts/types/#versions-and-migrations)

A migration is a function that moves objects from one version of a [type](#type) to another, renames a type, or upgrades a [content version](#content-version).

### Mnemonic

A mnemonic is the last six characters of an object's id, in upper case. It is short enough to read out or type.
`Obj.getMnemonic` returns it.

### [Object](/docs/echo/concepts/objects-relations/)

An object is a unit of data in a [space](#space). It is a bag of properties and values with a type and identity.

`db.remove` marks an object deleted. The object leaves query results and stays in the change history until the next
[epoch](#epoch).

### [Object type](/docs/echo/concepts/types/)

An object type is a [type](#type) made with `Type.makeObject`. It describes a record, such as a person.

### [Parent](/docs/echo/concepts/objects-relations/)

A parent is the object that another object belongs to. Removing the parent removes its children.

### Peer

A peer is a [client](#client) that takes part in a [space](#space). Each peer holds a [replica](#replica) of the space
and exchanges changes with the others. A member, in HALO's [glossary](/docs/halo/resources/glossary/#member), is the
identity that a peer acts for.

### PWA

PWA stands for [Progressive Web App](https://en.wikipedia.org/wiki/Progressive_web_app).

### [Query](/docs/echo/concepts/queries/)

A query is the shape around [filters](#filter). It says which entities to start from, which references or relations
to follow, and how to order, limit and group the results. Its results stay current as the data changes.

### [Reference](/docs/echo/concepts/references/)

A reference is a field whose value names another entity by its URI, and loads the target only when read.

### Registry

The registry holds the types and objects an app registers in code. The [Hypergraph](#hypergraph) keeps it in memory. A query reads it only when the query names it as a source, with `Scope.registry()`.

### Registry key

A registry key is the dotted name of an entry in the [registry](#registry), such as `com.example.template.agenda`. An
object made from the entry carries the key in its [metadata](#metadata), and `Filter.key` matches on it.

### [Relation](/docs/echo/concepts/objects-relations/)

A relation is an entity that joins a source and a target, and can have fields of its own.

### [Relation type](/docs/echo/concepts/types/)

A relation type is a [type](#type) made with `Type.makeRelation`. It describes a [relation](#relation) and fixes the
types of its source and its target.

### Replica

A replica is one [peer](#peer)'s full copy of a [space](#space)'s data. A peer reads and writes its own replica, and
the replicas exchange changes when the peers can reach each other. See
[Spaces and databases](/docs/echo/concepts/spaces/#replication).

### Scope

A scope is a source a query reads from: a [space](#space), the [registry](#registry), or a [feed](#feed).

### Signaling service

The signaling service introduces peers to each other so they can open direct connections. EDGE runs it. See
[Signaling and discovery](/docs/mesh/concepts/signaling/).

### Snapshot

A snapshot is an immutable copy of an object as it is at one moment. `Obj.getSnapshot` returns one, and so does the
`useObject` hook. A [live](#live) object changes after you read it, and a snapshot does not.

### Source

A source is one of the places a query's results come from. `from` names sources with a [scope](#scope). Inside a
space, the objects the [client](#client) has loaded, the index and EDGE each answer as a source of their own, and
`QueryResult.sources` lists them with their states. See [Queries](/docs/echo/concepts/queries/).

### [Space](/docs/echo/concepts/spaces/)

A space is an ECHO replication domain. It contains objects that all the peers in the space replicate continuously.

### Tag

A tag is an object of the `Tag` type, with a label and a hue, that other entities carry in their
[metadata](#metadata). `Filter.tag` matches the entities that carry one.

### [Type](/docs/echo/concepts/types/)

A type is an Effect Schema with a typename and a version, which every [object](#object) and [relation](#relation) names.

### [Typename](/docs/echo/concepts/types/)

A typename is the dotted, reverse-domain name of a [type](#type), such as `com.example.type.person`. With the type's
version it makes the type's [DXN](#dxn).

### URI

A URI is the string that names an entity or a resource. ECHO uses two kinds: an [EID](#eid) for an object or a space,
and a [DXN](#dxn) for a named resource such as a type. A [reference](#reference) stores the URI of its target.

### Version

A version is the semver part of a [type](#type)'s [DXN](#dxn), such as `0.1.0`. A change that old data does not fit
gets a new version and a [migration](#migration).

### [Walk](/docs/echo/concepts/feeds/)

A walk is a read of a [feed](#feed) along one path of its tree of branches. It goes forward from the root to a
branch, or backward from an item to the root.
