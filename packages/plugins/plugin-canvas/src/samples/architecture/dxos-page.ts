//
// Copyright 2026 DXOS.org
//

import { trim } from '@dxos/util';

/** A file or directory of the dxos repository on GitHub. */
export const code = (path: string) => `[\`${path}\`](https://github.com/dxos/dxos/tree/main/${path})`;

export const FENCE = '```';

export type DxosPageProps = {
  /** The link to the EDGE page, as markdown. */
  edge: string;
  /** The paragraph that embeds the data-stack drawing, where the reader can open one. */
  dataStack?: string;
};

const intro = (edge: string): string => trim`
  # DXOS

  The SDK Composer is built on. The client runs in the app and proxies a service stack in a worker: HALO keeps the identity, ECHO the spaces' objects as Automerge documents with indexes and queues over SQLite on OPFS, and MESH the peer network. The EDGE replicator keeps a space in sync with ${edge}.

  The split between client and services is what lets several tabs share one copy of the data. The client holds only what the app has asked for, and the services own storage, identity and the network. The two talk over RPC, so the client does not depend on where the services run.
`;

const rest = trim`
  ## Reading the code

  Read the diagram top to bottom: the app holds a proxy of every space, and the real data lives in a worker that one tab hosts, elected through a lock, and every open tab talks to.

  The election is \`DedicatedWorkerClientServices\` (${code('packages/sdk/client/src/services/dedicated')}). The tab that takes the Web Lock named by \`LEADER_LOCK_KEY\` (\`lock-key.ts\`) starts the dedicated worker, and the other tabs reach that worker through it. When the leading tab closes, its lock is released and another tab takes over.

  ### Client

  ${code('packages/sdk/client')} is the entry point an app creates; ${code('packages/sdk/react-client')} wraps it in hooks. The objects an app edits are proxies from ${code('packages/core/echo/echo-client')}: a change made with \`Obj.update\` lands in the object's Automerge document through a \`DocHandleProxy\`, and \`RepoProxy\` batches those changes to the worker. The schema API (\`Obj\`, \`Type\`, \`Ref\`, \`Filter\`) is ${code('packages/core/echo/echo')}.

  The hooks include \`useClient\` and \`useSpaces\`, which re-render a component when the client's state changes. \`RepoProxy\` (\`src/automerge/repo-proxy.ts\`) retries a batch the worker did not accept, and it resubscribes with backoff if the worker drops a subscription. A large incoming batch, such as a first sync, is delivered in bulk, so queries re-run once for the batch rather than once per document. Query results on the client are cached and kept current in \`src/query\`.

  ### Services

  ${code('packages/sdk/client-services')} builds the service stack in the worker. ${code('packages/core/echo/echo-host')} is ECHO's host: \`DataService\` takes the client's batches and hands them to \`DocumentsSynchronizer\`, which applies them to the \`AutomergeHost\`. The host persists every document to SQLite on OPFS (${code('packages/common/sql-sqlite')}), indexes it for queries (${code('packages/core/echo/index-core')}), and keeps queues in ${code('packages/core/echo/feed')}. Identity and credentials are HALO (${code('packages/core/halo')}); peer networking is MESH (${code('packages/core/mesh')}).

  The stack is a set of Effect layers composed in \`client-services-stack.ts\`. The keyring and the metadata store are SQLite tables too (\`SqliteKeyring\`, \`SqliteMetadataStore\`). \`DocumentsSynchronizer\` caps the size of each batch it sends back, because a first sync can make thousands of documents pending at once. \`IndexScheduler\` coalesces writes into indexing passes. The indexes cover object snapshots, full-text search on SQLite FTS5, and reverse references. \`QueryService\` compiles most queries to SQL, and \`DX_ECHO_QUERY_EXECUTOR=memory\` switches back to the in-memory executor. HALO's credentials, and the state machine that processes them, are in ${code('packages/core/halo/credentials')}, and MESH's peer-to-peer replication is built on ${code('packages/core/mesh/teleport')}.

  ### Sync

  \`EchoEdgeSubductionReplicator\` (${code('packages/core/echo/echo-host/src/edge')}) replicates each space's documents with EDGE over the WebSocket that \`EdgeClient\` (${code('packages/core/mesh/edge-client')}) keeps open. EDGE stores the space and forwards a change to the identity's other devices, so two devices converge through EDGE even when they are never online together.

  The replicator is a byte tunnel. It forwards every router message for the subduction service to the local repo unchanged, and it wraps each outbound message in a router frame. Outbound frames are coalesced into a \`SubductionBatchEnvelope\` of at most 256 KB, well under Cloudflare's 1 MB message limit. Subduction's sedimentree protocol decides what to send, so the replicator runs no Automerge sync of its own. When EDGE keeps signalling errors, the replicator re-handshakes in place a bounded number of times, then restarts the connection.

  ## An edit, end to end

  The path a change takes from one device to another, through the boxes of this diagram and the EDGE one:

  ${FENCE}mermaid
  %% Enable the Mermaid plugin to view the diagram inline.
  sequenceDiagram
    participant App as App (Obj.update)
    participant Client as echo-client (RepoProxy)
    participant Host as echo-host (worker)
    participant Repl as EdgeSubductionReplicator
    participant Router as EDGE router (RouterObject)
    participant Db as db-service (space DO)
    participant Peer as Other device
    App->>Client: change the object's Automerge doc
    Client->>Host: DataService.update (batched)
    Host->>Host: DocumentsSynchronizer applies to AutomergeHost
    Host->>Host: persist to SQLite on OPFS, re-index
    Host->>Repl: document changed
    Repl->>Router: subduction frames over the EdgeClient WebSocket
    Router->>Db: forward (DATABASE_MESSENGER)
    Db->>Db: SubductionHandler merges, SedimentreeStore persists
    Db->>Router: fan out to the space's other devices (ROUTER_MESSENGER)
    Router->>Peer: frames over that device's WebSocket
    Peer->>Peer: its replicator applies them, and DataService.subscribe updates its app
  ${FENCE}

  A device that is offline when the change lands catches up the next time it connects, because db-service keeps the merged document.

  The local half of the path finishes before any network step. The change is on disk and visible to queries in every tab once the worker has applied it. EDGE only carries it to other devices, so editing works offline and the queue of changes drains when the socket reopens.
`;

/**
 * The DXOS page's markdown. It imports nothing but a string helper, so a reader with no space, the docs site's
 * editor demo, shows the same text the template seeds.
 */
export const dxosPage = ({ edge, dataStack }: DxosPageProps): string =>
  [intro(edge), dataStack, rest].filter((part) => part !== undefined).join('\n\n');
