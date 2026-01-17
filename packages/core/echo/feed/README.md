# @dxos/feed

Append-only replicatable log consisting of blocks.

## Specification

### Concept

The feed is an append-only replicated log where data is stored in immutable blocks.
It is designed to run in multiple environments:

- **Browser**: Using `wasm-sqlite` in a Client Services Worker.
- **Node**: Native SQLite.
- **Cloudflare Workers**: Durable Objects SQL Storage.

All environments use `effect-sql` as the abstraction layer.

### Capacity

- **Feeds per Space**: ~1000
- **Blocks per Feed**: ~10,000

### Replication

- **Push**: Peers push blocks **without positions**.
- **Pull**: Peers pull blocks **with positions**, allowing them to reconstruct the global order locally.

#### Partial Replication

The protocol supports partial replication:

- **Per-Feed Configuration**: Each feed has independent replication settings.
  - **Default**: No replication (None).
  - **Replica Mode**: `replicate(fromPosition)` -> Replicates `[fromPosition, Infinity)`.
    - `fromPosition = 0`: Full History.
    - `fromPosition = current`: Live Tail only.
    - `fromPosition = now - 3days`: Time-based window (Future potential).
- **Metadata**: Replication settings are stored alongside feed metadata (locally).
- **Subset of Feeds**: Clients can choose to replicate only a specific subset of feeds within a Space.
  - _TODO: Define mechanism for selecting which feeds to replicate._
- **Range Selection**: Replication is strictly defined from a specific **start position** to the **end** (future blocks).
  - It is NOT possible to replicate only historical data without subscribing to new data.
  - Logic: `replicate(feedId, fromPosition) -> [fromPosition, Infinity)`

### Server Architecture (Cloudflare)

- **Initial Strategy**: **One Durable Object (DO) per Space**.
  - All feeds for a single space are managed by a single DO instance.
  - Simplifies consistency and coordination.
- **Scaling Strategy (Future)**: **Sharding by Feed ID**.
  - Feeds can be distributed across multiple DOs.
  - Shard Key: Prefix of `hash(feedId)` (e.g., first 2 chars).

### Ordering

Ordering is determined by the following rules:

1.  **Positioned Blocks**: Blocks that have been assigned a global `position` by the Server.
    - Ordered strictly by `position` (ascending).
2.  **Unpositioned Blocks**: Blocks pending position assignment (locally created or in-flight).
    - Ordered by **Lamport Timestamp** rules:
      1.  `sequence` (Ascending)
      2.  `actorId` (Lexicographical)

`sequence`: Assigned by the peer (Author). `actorId` + `sequence` forms the Lamport timestamp.

> `nextSeq = max(previous_seq_in_this_feed) + 1`

`position`: Assigned ONLY by the Server. Monotonic counter per Space.

### Idempotency

The protocol is idempotent. A block is uniquely identified by the tuple:

- `(spaceId, feedId, sequence, actorId)`
  OR
- `(spaceId, feedId, position)` (if positioned)

Processing the same block multiple times must be handled gracefully (e.g., `ON CONFLICT DO NOTHING`).

### Schema

#### Feeds Table (`feeds`)

Stores the mapping between global feed identifiers and local integer IDs.

| Field           | Type     | Description                                                                   |
| :-------------- | :------- | :---------------------------------------------------------------------------- |
| `feedPrivateId` | `number` | **Primary Key**. Local integer identifier for the feed (private to the peer). |
| `spaceId`       | `string` | The global Space ID (external).                                               |
| `feedId`        | `string` | The global Feed ID (ULID).                                                    |
| `feedNamespace` | `string` | **Optional**. Application specific namespace for filtering feeds.             |

**Indexes**:

- Unique Index: `(spaceId, feedId)`

#### Blocks Table (`blocks`)

| Field           | Type             | Description                                           |
| :-------------- | :--------------- | :---------------------------------------------------- |
| `feedPrivateId` | `number`         | Foreign key to `feeds.feedPrivateId`.                 |
| `position`      | `number \| null` | The global position index. `null` if unpositioned.    |
| `sequence`      | `number`         | **Sequence Number** (Assigned by Author).             |
| `actorId`       | `string`         | **Actor ID** (Public Key).                            |
| `predSequence`  | `number`         | **Sequence Number** part of the Predecessor ID.       |
| `predActorId`   | `string`         | **Actor ID** (Public Key) part of the Predecessor ID. |
| `timestamp`     | `number`         | Unix timestamp in milliseconds.                       |
| `data`          | `Uint8Array`     | The content of the block. **Immutable**.              |

**Indexes**:

- Unique Index: `(feedPrivateId, position)`
- Unique Index: `(feedPrivateId, sequence, actorId)`

#### Subscriptions Table (`subscriptions`)

Stores active subscriptions to optimize wire protocol.

| Field            | Type     | Description                               |
| :--------------- | :------- | :---------------------------------------- |
| `subscriptionId` | `string` | **Primary Key**. Unique ID.               |
| `expiresAt`      | `number` | Unix timestamp when subscription expires. |
| `feedPrivateIds` | `string` | JSON array of `feedPrivateId`s.           |

### Sync Protocol (Message-Based RPC)

The sync protocol is message-based. All messages include a `requestId`. Responses must copy the `requestId` from the request.

1.  **Query**
    - Input: `requestId`, `(feedIds: string[]) + cursor` OR `(subscriptionId: string) + cursor`
    - Output: `requestId`, `Block[]` (Stream or Batch)
    - Description: Returns blocks from the specified feeds (or subscription) with `position > cursor`.

2.  **Subscribe**
    - Input: `requestId`, `feedIds: string[]`
    - Output: `requestId`, `subscriptionId: string`
    - Description: Registers a subscription for specific feeds. Returns a `subscriptionId`.

3.  **Append**
    - Input: `requestId`, `namespace?: string`, `blocks: Block[]`
    - Output: `requestId`, `positions: number[]`
    - Description: Appends blocks to their respective feeds (derived from `actorId` in block).
      - If `namespace` is provided and the feed is new, it sets the feed's namespace.
      - Returns the assigned global positions.

### Logic

#### Feed Identification

A feed is globally identified by the tuple `(spaceId, feedId)`.

- `spaceId`: String provided externally.
- `feedId`: ULID string.

#### Timestamps

All timestamps (e.g., `insertionTimestamp`) are Unix timestamps in milliseconds.

## Usage Examples

### 1. Append Blocks

**Request:**

```json
{
  "requestId": "req-1",
  "namespace": "my-app-data",
  "blocks": [
    {
      "actorId": "01H1...",
      "sequence": 100,
      "data": "...",
      "timestamp": 1234567890
    }
  ]
}
```

**Response:**

```json
{
  "requestId": "req-1",
  "positions": [42]
}
```

### 2. Subscribe and Query

**Subscribe Request:**

```json
{
  "requestId": "req-2",
  "feedIds": ["01H1..."]
}
```

**Subscribe Response:**

```json
{
  "requestId": "req-2",
  "subscriptionId": "sub-123",
  "expiresAt": 1234569999
}
```

### 3. List Feeds

**Request:**

```json
{
  "requestId": "req-4",
  "namespace": "data"
}
```

**Response:**

```json
{
  "requestId": "req-4",
  "feeds": [
    { "feedId": "01H1...", "namespace": "data" },
    { "feedId": "02H2...", "namespace": "data" }
  ]
}
```

**Query Request (Poll using Subscription):**

```json
{
  "requestId": "req-3",
  "subscriptionId": "sub-123",
  "cursor": 41
}
```

**Query Response:**

```json
{
  "requestId": "req-3",
  "blocks": [
    {
      "position": 42,
      "sequence": 100,
      "actorId": "01H1...",
      "data": "..."
    }
  ]
}
```
