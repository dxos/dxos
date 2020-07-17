## ECHO

### System Architecture

ECHO allows nodes in a P2P network to share data with read-write access and eventual consistency.

Nodes modify data by creating and sending mutation messages that are eventually received by all
other nodes in the network (see MESH).

(Add diagram of network/nodes)

Messages sent by each node are delivered in creation order and associated with a monotonically
increasing sequence number in a structure called a Feed.

Each node reads all the Feeds from all the other nodes under a Feed aggregation mechanism called a Party (see HALO).
Feeds provide a partial order constraint: messages from each node are delivered in creation order (increasing 
sequence number) and delivered only once, but messages from different nodes are un-ordered. 
The ECHO Consistency Domain (see below) provides an additional causal delivery constraint.   

All messages have a `type` field that facilitates demultiplexing on message delivery (see below).

### Models

Models are kinds of replicated state machine, conforming to the ECHO Model interfaces and message protocols and
are core to the operation of ECHO : all data and metadata is replicated using Models.
A Model typically implements replicated data with particular structure and consistency properties, for example:
the base model collection includes: Property Set and Growable Array. Custom and application-specific models
are also supported.

Models are published in the DXNS (TODO: more on this -- needed e.g. to support snapshot of data in non-base models
so the snapshot bot can load the model code).

Models receive and emit mutation messages on Anchored Streams (see below). Models may optionally
implement the Snapshot Serialization interface (see below).

## Items

An _Item_ is an instance of a Model. Each Item has a unique id and a model type. (True? there are no instances
of models that are not Items). Item ids comprise a flat namespace. Items are created with a message of type
`create_item`. ("Item" could be "Object" or some other term tbd).

## Metadata Item

Every Item has an implicit associated _Metadata Item_ which is an instance of the Item Properties Model.
Metadata Items hold system information about Items such as display name, Embedded Items (see below) and access 
control metadata.

### Item Embedding

Items may be logically embedded within another Item. For example a Threaded Log Item holding the moves for a
game of chess may embed a `Concurrent Text Edit` Item for the players to make notes and comments on the game.

While one Item's data may simply internally reference the id of any other Item, this association would be opaque
to ECHO. By exposing embedding relationships to the system, snapshots can be supported.

The ids of Embedded Items are added to the `embedded_items` Item Metadata property. Note that this set contains only
direct child Item ids.

(TODO: note parent/child causal order requirement for item create vs parent mutation messages)

## Views

A View is a special kind of Item with an id that is an _Inception Key_ and has the required set of View 
Item Properties:

 * `view_class`: Defines the purpose of the data contained in the view, and facilitates application discovery, 
 registered in DXNS. e.g. planner data or chess game.
 * `display_name`: Human-readable name for the view.
 * `id_proof`: Credential proving inception key control.

### View Embedding

(TODO When a canvas drawing is inside an editor document : is this any different than Item Embedding?)

### View Linking

A View is addressable with a globally resolvable stable locator comprising its inception key and the containing party key.
(How do we encode and resolve these?)

## Example: A Planner App

The root Item for a Planner App's data is a View with class "dxrn:dxos.network:planner_app??", and model 
type `Property Set`. Embedded via a reference value in the propety set is another Item: a `Growable Array` that 
represents the planner board. The elements of that array are references to embedded `Property Set` Items that
themselves embed another `Growable Array` Item. These represent lists of tasks on the planner board.
Next, each of those "list" Items embeds a `Growable Array` containing references to `Property Set` Items
that represent individual Tasks. And finally, a property of the task Items references an embedded `Concurrent Text Edit` 
Item that allows users to make comments on the task.

![Planner Models](https://github.com/dxos/echo/raw/dboreham/doc/docs/content/diagrams/planner_models.png)

TODO: example messages session?, finish diagram, add embedded task chat.

### Snapshots

ECHO Models maintain their current state by processing received mutation messages. This means that when a large
number of messages have been created, for example due to user activity over a long period of time, any new ECHO client
will need to retrieve and process all those messages. This may lead to poor start up performance. In addition, storage
required for so many mutation messages may be costly or not available. 

Snapshots provide a solution to these problems: a Snapshot is a consistent serialized copy of the current state of
the Items comprising a View, at a particular Anchor (see below). The data comprising a snapshot is collected by
calling the `snapshotSerialize()` model method recursively on every Item across the transitive closure for the View,
while pausing delivery of new messages.

Nodes accessing a View may do so by: first load a snapshot (which is much more efficient than retrieving
and processing the equivalent mutation messages, then "catch up" to latest state by processing only
the mutation messages since the snapshot anchor. (TODO: details - how are feeds truncated? can one view be
independently snapshotted vs the whole party? how is the snapshot authenticated?)

### Consistency Domain

A _Consistency Domain_ defines a logical space within which messages are orderable under some particular ordering constraints.
The ECHO Consistency Domain provides strong clock consistency for all model mutation messages, meaning that messages may be
compared to determine if one happened after the other, or they occurred concurrently. Models may leverage the ECHO 
Consistency Domain to implement their internal reconciliation and convergence mechanisms but all mutation messages
emitted by models are within the ECHO consistency domain. This allows support for Snapshots. 

The ECHO Consistency Domain is implemented with a _Logical Clock_ that provides the strong clock consistency condition.
All model mutation messages are associated with a clock stamp from that logical clock.

### Anchored streams

A Model consumes mutation messages via an _Anchored Stream_. A Read Anchored Stream is like a regular read message stream 
with the addition of a `getAnchor()` method, returning an opaque and serializable long-lived anchor which can be passed
as a parameter when opening a new stream. The new stream will deliver only messages occurring after the last message
delivered before the call to `getAnchor()`. Thus a Model can store its current state along with an Anchor, then 
subsequently retrieve the stored current state and continue processing new mutation messages after the Anchor. 
Anchored Read Streams allow efficient implementation of ECHO clients that execute intermittently or as Lambas because
it is not necessary to re-process all mutation messages, only those received since the client was last active.

A Write Anchored Stream is like a regular write message stream with the addition of a `getAnchor()` method, 
returning an opaque and serializable long-lived anchor which can be used to check or be notified if a Read
Anchored Stream has delivered the last message written. This mechanism makes it possible to know that a given
set of locally generated mutation messages has been delivered and therefore processed and included in the 
current model state.

### Message Delivery Order

Messages are delivered (received by a Model acting as an Anchored Stream sink) in causal order.

(Add stack/system components diagram)

### Message Encoding

TODO: Protocol buffers. Show examples. Link to .proto files.

## Glossary

#### Anchor
#### Causal
#### Feed
#### Inception Key
#### Item
#### Partial Order
#### Snapshot
#### Stream
#### View
