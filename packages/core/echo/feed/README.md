# @dxos/feed

Append-only replicatable log consisting of blocks.

## Specification

### Concept

The feed is an append-only replicated log where data is stored in immutable blocks.

### Replication

- **Push**: Peers push blocks **without positions**.
- **Pull**: Peers pull blocks **with positions**, allowing them to reconstruct the global order locally.

### Ordering

The feed is ordered based on the following precedence:

1. **Positioned Blocks**: Blocks with a defined `position` are ordered locally by that position (ascending).
2. **Unpositioned Blocks**: Blocks where `position` is `null` follow the positioned blocks. They are ordered by **Lamport Clock rules**:
   - Primary Key: **Sequence Number** (ascending).
   - Secondary Key: **Peer ID** (ascending, to resolve ties).

### Schema

#### Feeds Table (`feeds`)

Stores the mapping between global feed identifiers and local integer IDs.

| Field           | Type     | Description                                                                   |
| :-------------- | :------- | :---------------------------------------------------------------------------- |
| `feedPrivateId` | `number` | **Primary Key**. Local integer identifier for the feed (private to the peer). |
| `spaceId`       | `string` | The global Space ID (external).                                               |
| `feedId`        | `string` | The global Feed ID (ULID).                                                    |

**Indexes**:

- Unique Index: `(spaceId, feedId)`

#### Blocks Table (`blocks`)

Stores the actual feed data. `blockId` and `predecessorId` are split into sequence number and peer ID columns.

| Field           | Type             | Description                                                |
| :-------------- | :--------------- | :--------------------------------------------------------- |
| `feedPrivateId` | `number`         | Foreign key to `feeds.feedPrivateId`.                      |
| `position`      | `number \| null` | The global position index. `null` if unpositioned.         |
| `sequence`      | `number`         | **Sequence Number** part of the Block ID.                  |
| `actorId`       | `string`         | **Actor ID** (Public Key) part of the Block ID.            |
| `predSequence`  | `number`         | **Sequence Number** part of the Predecessor ID.            |
| `predActorId`   | `string`         | **Actor ID** (Public Key) part of the Predecessor ID.      |
| `timestamp`     | `number`         | Unix timestamp in milliseconds when the block was created. |
| `data`          | `Uint8Array`     | The content of the block. **Immutable**.                   |

**Indexes**:

- Unique Index: `(feedPrivateId, position)`
- Index: `(feedPrivateId, sequence, actorId)`

### Logic

#### Sequence Number Generation

The sequence number for a new block is calculated as:
`nextSeq = max(previous_seq_in_this_feed) + 1`

#### Feed Identification

A feed is globally identified by the tuple `(spaceId, feedId)`.

- `spaceId`: String provided externally.
- `feedId`: ULID string.

#### Timestamps

All timestamps (e.g., `insertionTimestamp`) are Unix timestamps in milliseconds.
