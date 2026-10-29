---
layout: cover
---

# ECHO

The DXOS object database: typed, local-first, and replicated peer to peer and through EDGE.

<!--
- ECHO is the data layer under Composer and every DXOS app.
- This deck builds it up from the foundations: types, then the CRDT that stores them, then the spaces that share them, then how they are queried, replicated, migrated and acted on.
-->

---

# What ECHO is

<v-clicks>

- **Objects, not rows**: every entity is a typed object with a stable id, in a graph of references.
- **Local first**: the full database lives on the device; reads and writes never wait for a server.
- **Collaborative**: concurrent edits merge automatically, as a CRDT.
- **Shared by spaces**: a space is the unit of membership, access and replication.
- **Replicated twice over**: peer to peer over MESH, and through EDGE on Cloudflare.
- **Programmable**: queries, feeds, triggers and agents all work over the same objects.

</v-clicks>

<!--
- Each bullet is a later section; this slide is the map.
-->

---

layout: section
---

# Foundations: types

---

layout: two-cols
---

# A type is a schema

A type is an Effect Schema with an identity: a DXN typename and a version.

<v-clicks>

- `Type.makeObject` returns a class that is both the runtime schema and the TypeScript type.
- Annotations add a label, an icon and form hints.
- The same schema validates writes and drives generated UI.

</v-clicks>

::right::

```ts {1,11}
export class Milestone extends Type.makeObject<Milestone>(DXN.make('org.dxos.type.milestone', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    description: Format.Text.pipe(Schema.optional),
    targetDate: Format.DateOnly.pipe(Schema.optional),
  }).pipe(
    Schema.annotate({ title: 'Milestone' }),
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--flag-banner--regular', hue: 'amber' }),
  ),
) {}
```

<!--
- From packages/sdk/types/src/types/Milestone.ts.
- The DXN comes first, then the schema; the class is used both as a value (to create and query) and as a type.
-->

---

layout: two-cols
---

# JSON Schema, in the space

<v-clicks>

- Every Effect Schema converts to JSON Schema and back (`JsonSchema.toJsonSchema` / `toEffectSchema`).
- A space stores its types as objects of the meta-type `Type.Type`: `{ typename, version, jsonSchema }`.
- So a type can be created at runtime, from raw JSON Schema (`Type.makeObjectFromJsonSchema`), and shared like any object.
- Types are queried like data: `Filter.type(Type.Type)`.

</v-clicks>

::right::

```json
{
  "typename": "org.dxos.type.milestone",
  "version": "0.1.0",
  "jsonSchema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "targetDate": {
        "type": "string",
        "format": "date"
      }
    },
    "required": ["name"]
  }
}
```

<!--
- Persisted types are what let a user define a new table in Composer without shipping code.
-->

---

# References make a graph

<v-clicks>

- A property declared `Ref.Ref(Person)` holds a reference, stored as `{ "/": "dxn:…" }`.
- References resolve lazily: loading a ref loads only the object it names.
- Relations are first-class entities with a source and a target.
- The graph spans types: a document can embed a drawing, a deck can embed a chart.

</v-clicks>

```ts
const task = Obj.make(Task, { title: 'Ship it', assignee: Ref.make(alice) });
const person = await task.assignee.load();
```

---

layout: section
---

# Foundations: the CRDT

---

# Automerge underneath

<v-clicks>

- Every object is stored in an Automerge document: a CRDT whose concurrent changes merge without coordination.
- Edits from any device, online or offline, converge to the same state.
- Strings are CRDTs too: `Text.splice` edits text by key path, so two people can type in one paragraph.
- ECHO pins Automerge 3.5 and automerge-repo with subduction support, and ships local patches to both.

</v-clicks>

<!--
- Automerge gives us the merge semantics; ECHO gives the documents a schema, ids, references and queries.
-->

---

layout: two-cols
bleed: right
---

# One document per object

<v-clicks>

- Each space has an immutable `SpaceRoot` document pointing at its `DatabaseDirectory`.
- The directory maps each object id to the URL of that object's own Automerge document (`links`).
- Small objects can be inlined in the directory instead (`root-doc` placement).
- So a space syncs object by object, and a large space never loads as one document.

</v-clicks>

::right::

<Surface ref="{{composer-echo}}" />

---

# Linking a new object

```ts {1-4,7-8}
const spaceDocHandle = this._repoProxy.create<DatabaseDirectory>({
  version: SpaceDocVersion.CURRENT,
  access: { spaceId: this._spaceId, spaceKey: this._spaceKey.toHex() },
});
// …
this._spaceRootDocHandle.change((newDoc: DatabaseDirectory) => {
  newDoc.links ??= {};
  newDoc.links[objectId] = new A.RawString(url);
});
```

<!--
- From packages/core/echo/echo-client/src/core-db/entity-manager.ts.
- A new document is created for the object, then its URL is written into the directory, one Automerge change.
-->

---

# What DXOS adds to Automerge

<v-clicks>

- **Collection sync**: a space-level protocol that agrees which documents a peer has before syncing them.
- **SQLite storage**: an Automerge storage adapter over SQLite, in the browser and on the server.
- **Leases and eviction**: documents load on demand and are released when unused.
- **Quarantine**: a corrupt or oversized document is set aside instead of breaking the space.
- **Branches**: per-object branches, merged back by convergence key.
- **EDGE replication**: subduction frames batched under Cloudflare's 1 MB WebSocket limit.

</v-clicks>

---

layout: section
---

# Spaces and credentials

---

layout: two-cols
---

# A space is a trust boundary

<v-clicks>

- A space starts with one trusted key: its own.
- Every member, device and feed is admitted by a credential signed by a key already trusted.
- The space id is derived from the space key: the first 20 bytes of its SHA-256.
- Identity (HALO) is itself a space: devices are admitted to it the same way.

</v-clicks>

::right::

```ts {2-3,5-7}
// Genesis: the space admits itself, its creator and its control feed.
await createCredential({ signer, issuer: spaceKey, subject: spaceKey,
  assertion: create(SpaceGenesisSchema, { spaceKey, membershipPolicy }) }),
await createCredential({ signer, issuer: spaceKey, subject: identityKey,
  assertion: create(SpaceMemberSchema, {
    spaceKey, role: SpaceMember_Role.ADMIN, profile, genesisFeedKey: controlKey,
  }) }),
await this.createFeedAdmission(spaceKey, controlKey, AdmittedFeed_Designation.CONTROL),
```

---

# Invitations and the credential chain

<v-clicks>

- An invitation runs between host and guest, authenticated by nothing, a shared secret, or a known public key.
- On success the host admits the guest as an editor, with its feeds.
- The credential chain is moving from a hypercore control feed to an Automerge `CredentialsDocument`, keyed by credential id so concurrent admissions converge.
- EDGE can also handle invitations, so a guest can join when the host is offline.

</v-clicks>

---

layout: section
---

# Queries

---

layout: two-cols
---

# One query language

<v-clicks>

- `Query.select(Filter.type(Person, { name: 'alice' }))` builds a query AST.
- Filters compose: by type, properties, id, tag, full text, and `not`; with order and aggregates.
- A result is one-shot (`.run()`) or live (`.subscribe()`); React reads it with `useQuery`.
- The same AST runs in the client, on the host and on EDGE.

</v-clicks>

::right::

```ts {3}
Effect.gen(function* () {
  yield* Database.add(Obj.make(Person, { name: 'alice' }));
  const results = yield* Database.query(Query.select(Filter.type(Person, { name: 'alice' }))).run;
});
```

---

# Where a query runs

<v-clicks>

- **Client**: a working-set executor scans the objects already in memory, with no round trip.
- **Host**: a query the client cannot answer (full text, time) is compiled to SQL and run over SQLite indexes.
- **Indexes**: full text (FTS5), reverse references, entity metadata, object snapshots and activity.
- **Live**: a subscribed query re-runs as data changes, debounced by its cost.
- Vector search is named in the query plan but not implemented yet.

</v-clicks>

---

layout: section
---

# Feeds

---

layout: two-cols
---

# Append-only logs

<v-clicks>

- A feed is an ECHO object (`Feed.Feed`) over an append-only log of immutable blocks.
- The log is SQLite everywhere: wasm SQLite in the browser, native in Node, Durable Object SQL on Cloudflare.
- The server assigns each block a global position; until then blocks order by a Lamport clock.
- Readers keep cursors; a feed replicates partially, from a position on.
- Feeds hold what objects should not: agent conversations, messages, event streams.

</v-clicks>

::right::

```ts
const feed = db.add(Feed.make({}));
await db.flush();

const alice = Obj.make(Person, { name: 'Alice' });
const bob = Obj.make(Person, { name: 'Bob' });
await db.appendToFeed(feed, [alice, bob]);
```

---

layout: section
---

# Replication: P2P and EDGE

---

layout: two-cols
---

# Peer to peer: MESH

<v-clicks>

- Transport (WebRTC) → Teleport (multiplexed streams) → Signal (over EDGE) → Swarm.
- Each space joins a swarm whose topic is its id: a few connections, at most ten peers.
- A connection authenticates by credentials, then adds extensions: replication, notarization, and Automerge sync.
- One Automerge repo serves every space, so two devices need one connection however many spaces they share.

</v-clicks>

::right::

```ts {2-5}
const topic = await this._topic;
this._connection = await this._networkManager.joinSwarm(ctx, {
  protocolProvider: this._createProtocolProvider(credentials),
  topic,
  topology: this._topology,
});
```

---

layout: two-cols
bleed: right
---

# EDGE: Cloudflare services

<v-clicks>

- EDGE is a set of Cloudflare Workers with Durable Objects, in its own repository.
- The router holds each device's WebSocket; the hub holds accounts and invitations.
- The db service keeps every space's documents, so a lone device still syncs and recovers.
- Compute runs functions and triggers next to the data, through Data, Queue and AI service bindings.

</v-clicks>

::right::

<Surface ref="{{edge}}" />

---

layout: two-cols
bleed: right
---

# Syncing with EDGE

<v-clicks>

- Devices replicate documents with EDGE over subduction, Automerge's sync for many documents.
- Frames are batched under the 1 MB WebSocket limit.
- EDGE answers queries too (`execQuery`), so a thin client need not hold the whole space.

</v-clicks>

::right::

<Surface ref="{{edge-subduction}}" />

---

layout: section
---

# Schema migration

---

layout: two-cols
---

# Types evolve in place

<v-clicks>

- **Object migrations** (`Migration.define`) move objects from one type version to the next.
- **Renames** (`defineRename`) repoint references to a renamed entity.
- **Content migrations** (`defineContent`) step a format inside an object, by version.
- A migration swaps the type in place: data, type and metadata in one change, on the same object id, so references never break.
- Composer runs every contributed migration on each space as it registers; migrations are idempotent.

</v-clicks>

::right::

```ts {2-4,6}
export const sceneV1ToV2 = Migration.defineContent({
  type: Drawing.Canvas,
  from: Canvas.SCENE_SCHEMA_V1,
  to: Canvas.SCENE_SCHEMA,
  since: '0.17.0',
  transform: ({ content, styles }) => ({ content: upgradeSceneContent(content), styles }),
});
```

---

layout: section
---

# Agents

---

layout: two-cols
---

# Compute over the same objects

<v-clicks>

- An **operation** is a typed function: input and output schemas plus a handler, run locally or remotely.
- A **trigger** is an ECHO object that runs an operation on a query match, a feed append, a timer, an email or a webhook.
- An **agent** is a conversation process bound to a feed, tools (operations) and instructions.
- Triggers and agents run on the device or on EDGE, next to the data.

</v-clicks>

::right::

```ts {3-4}
const trigger = Trigger.make({
  runnable: Ref.make(functionObj),
  enabled: true,
  spec: Trigger.specSubscription(Query.select(Filter.type(Person))),
});
yield * Database.add(trigger);
```

---

layout: two-cols
bleed: right
---

# The whole stack

<v-clicks>

- Types define objects; Automerge stores them; spaces share them.
- Queries read them, feeds log beside them, migrations evolve them.
- MESH and EDGE replicate them; operations, triggers and agents act on them.

</v-clicks>

::right::

<Surface ref="{{composer-data}}" />

---

layout: end
---

# Thank you

Read the code: `packages/core/echo`, `packages/core/halo`, `packages/core/mesh`, `packages/core/compute`.
