//
// Copyright 2026 DXOS.org
//

import { EID, type Obj } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { trim } from '@dxos/util';

/** The drawings the documents embed, by the role each plays. */
export type DocDrawings = {
  composer: Drawing.Drawing;
  data: Drawing.Drawing;
  edge: Drawing.Drawing;
};

export type Docs = {
  /** The root: what Composer is, linking the other two and embedding its architecture. */
  composer: Markdown.Document;
  dxos: Markdown.Document;
  edge: Markdown.Document;
};

// Space-relative URIs, as the editor writes them, so the links resolve in whatever space the template seeds.
const link = (label: string, object: Obj.Unknown) => `[${label}](${EID.make({ entityId: object.id })})`;
const embed = (label: string, object: Obj.Unknown) => `![${label}](${EID.make({ entityId: object.id })})`;

/** A file or directory of the dxos repository on GitHub. */
const code = (path: string) => `[\`${path}\`](https://github.com/dxos/dxos/tree/main/${path})`;

const FENCE = '```';

/** The three documents that introduce the diagrams: Composer, which links DXOS and EDGE. */
export const makeDocs = (drawings: DocDrawings): Docs => {
  const edge = Markdown.make({
    name: 'EDGE',
    content: trim`
      # EDGE

      The DXOS services on Cloudflare. Composer and the hub CLI reach them through the edge router and the hub, which holds accounts. Behind them run the db, compute, identity, kms, ai and blob services, over KV, R2, D1 and queues.

      Composer talks to the router over one WebSocket plus plain HTTP, and signs in to the hub with a passkey. The hub CLI (\`hub-cli\`) uses the HTTP API only. Each service is its own worker, so the router reaches the others through Cloudflare service bindings rather than over the network.

      Open a service to drill into its diagram; db-service's replication opens a third level.

      ${embed('EDGE architecture', drawings.edge)}

      ## Reading the code

      EDGE lives in its own repository, \`dxos/edge\`, as one Cloudflare worker per service under \`packages/services\`. Each service's \`wrangler.jsonc\` is the place to start: it names the worker, its Durable Objects and the bindings it calls other services through.

      Every box in these drawings carries a \`ref\` to a path in that repository, prefixed \`edge/\`. The client half of each connection lives in this repository, in ${code('packages/core/mesh/edge-client')}. There \`EdgeClient\` (\`edge-client.ts\`) owns the device's WebSocket, and \`EdgeHttpClient\` (\`edge-http-client.ts\`) makes the HTTP calls under \`/db/\`, \`/compute/\`, \`/blob/\`, \`/ai/\` and the other service prefixes.

      ### The front door

      \`edge\` is the router worker every client talks to. Its Hono API (\`src/api.ts\`) mounts the realtime routes and proxies each path prefix (\`/db\`, \`/functions\`, \`/kms\` ...) to the service behind it. The \`router\` service holds the live connections: one \`RouterObject\` Durable Object per identity keeps that identity's device WebSockets, and \`SwarmObject\` tracks who is in which swarm. A message for a device, from any service, goes through \`ROUTER_MESSENGER\` to that device's \`RouterObject\`.

      The prefix routing is \`src/service-proxy.ts\`, which forwards a request over the target service's binding. The same worker serves the R2 backup routes (\`src/backups/api.ts\`) and the admin and KMS routes (\`src/admin.ts\`). Data management hands storage purges to \`purge-orchestrator.ts\` through the \`storage-purge\` queue. On the router side, \`src/worker/api.ts\` accepts the WebSocket and the \`/inbox\` API, and \`Inbox\` serves user-to-user notices, which \`EdgeHttpClient\` reaches under \`/inbox/\`. Traffic from a \`RouterObject\` to db-service goes through the \`DATABASE_MESSENGER\` binding.

      ### Accounts

      \`hub-service\` holds accounts and passkey login. The router asks it who a connection belongs to before it lets anything through.

      The hub worker (\`src/worker.ts\`) splits into login and the account API. Passkey and session login are in \`src/auth\`, and sessions live in the \`SESSION_KV\` namespace. The account API (\`src/api\`) goes through the user and plan managers in \`src/db\`, which keep accounts in the hub's D1 database. Other services bind to \`HubServiceEntry\` (\`src/entrypoint/hub-service.ts\`), which also records usage through \`UserMetering\`. \`MailboxObject\` is a Durable Object that holds an account's messages, and the managers reach db-service through the \`DATA_SERVICE\` binding.

      ### Data

      \`db-service\` is the server half of ECHO. A space's replication runs in a Durable Object: the \`SubductionHandler\` takes the frames a client sends, its \`AutomergeReplicator\` merges them, and \`SedimentreeStore\` keeps the result in the object's storage. The \`Indexer\` reads the merged documents to answer queries, and \`SpaceMetadata\` backs the space up to R2. The replicator's lifecycle, including what happens when an instance is evicted, is specified in \`subduction/replication-spec.md\`; the round trip is drawn in the DXOS document.

      Requests enter through \`src/worker/entrypoint\` and the handlers in \`src/worker/api-handler\`. \`SpaceStateMachine\` holds a space's credentials, which decide who may read and write it. Queues replicate separately: \`FeedSpace\` owns a space's feeds and \`FeedReplicator\` syncs them. The \`Indexer\` reads both kinds of data, documents through \`SubductionSource\` and feeds through \`FeedSource\`, and \`QueryExecutor\` answers queries from its index. \`SpaceRegistry\` tracks spaces through a registry queue. The merge itself runs in WebAssembly, built from \`edge/packages/sdk/edge-automerge\`, and the replicator's storage \`Migrations\` sit beside it in \`subduction/migrations\`.

      ### Compute

      \`compute-service\` runs the functions a space deploys. Its \`FunctionInvoker\` runs one when it is called, when a trigger's scheduler fires, or as a workflow step, and hands it the db, ai and kms services. Composer reaches it through the same router, under \`/functions\`.

      Triggers dispatch to a scheduler Durable Object (\`src/triggers/scheduler-object.ts\`), and \`ProcessObject\` spawns invocations for a running process. \`WorkflowExecutor\` feeds a workflow's steps to the invoker one at a time. The invoker loads a function into the runtime (\`src/runtime\`), which reads its code from D1 and R2 and streams its logs to \`FunctionsLogger\`. \`FunctionsRegistry\` stores the code when a function is uploaded. On this repository's side, ${code('packages/core/compute/edge-compute')} holds \`EdgeOperationInvoker\` and \`EdgeTriggerManager\`, whose \`EdgeHttpClient\` calls go to routes such as \`/compute/functions/<functionId>\` and the cron triggers under \`/compute/functions/<spaceId>/triggers/crons\`.

      ## A device connecting

      Every message in the DXOS document's sequence rides one WebSocket per device. Opening it is where EDGE learns who the device is: the client proves its identity with a HALO credential, and the router hands the socket to that identity's Durable Object, which every later message for the identity goes through.

      The handshake is in \`auth-challenge.ts\`, shared by the HTTP and WebSocket clients. \`fetchAuthChallenge\` asks \`/auth\` for a challenge up front. Against an older server, \`handleAuthChallenge\` reads the challenge from the \`VerifiablePresentation\` scheme of a 401's \`WWW-Authenticate\` header instead. The identity that signs it comes from \`auth.ts\`: \`createChainEdgeIdentity\` presents the HALO credential chain, and \`createDeviceEdgeIdentity\` presents a bare device key.

      ${FENCE}mermaid
      %% Enable the Mermaid plugin to view the diagram inline.
      sequenceDiagram
        participant Client as EdgeClient (device)
        participant Router as edge router (Hono API)
        participant Hub as hub-service
        participant RouterObj as RouterObject (per identity)
        participant Db as db-service
        Client->>Router: GET /auth
        Router-->>Client: challenge
        Client->>Client: sign the challenge into a verifiable presentation (HALO)
        Client->>Router: GET /ws/:identityDid/:peerKey (presentation in the WebSocket subprotocol)
        Router->>Router: edgeAuth verifies the presentation
        Router->>Hub: look up the account
        Hub-->>Router: account
        Router->>Router: path identity must match the verified one
        Router->>RouterObj: forward the upgrade (Durable Object named by the identity DID)
        RouterObj-->>Client: socket accepted
        Client->>RouterObj: subduction frames for a space
        RouterObj->>Db: DATABASE_MESSENGER
        Db->>RouterObj: replies and other devices' changes (ROUTER_MESSENGER)
        RouterObj-->>Client: frames
      ${FENCE}

      Once the socket is open, every service reaches the device the same way: through \`ROUTER_MESSENGER\` to its identity's \`RouterObject\`.

      The subprotocol also picks the wire format. \`EdgeWsConnection\` (\`edge-ws-connection.ts\`) turns on flow control when the server accepts \`EdgeWebsocketProtocol.V2\`. \`edge-ws-muxer.ts\` cuts a large message into 16 KB chunks, since Cloudflare caps one WebSocket message at 1 MB. \`EdgeClient\` keeps the socket alive with a \`PersistentLifecycle\`: it reconnects after a failure, reopens the socket when the identity changes, and sends \`__ping__\` to measure round-trip time.
    `,
  });

  const dxos = Markdown.make({
    name: 'DXOS',
    content: trim`
      # DXOS

      The SDK Composer is built on. The client runs in the app and proxies a service stack in a worker: HALO keeps the identity, ECHO the spaces' objects as Automerge documents with indexes and queues over SQLite on OPFS, and MESH the peer network. The EDGE replicator keeps a space in sync with ${link('EDGE', edge)}.

      The split between client and services is what lets several tabs share one copy of the data. The client holds only what the app has asked for, and the services own storage, identity and the network. The two talk over RPC, so the client does not depend on where the services run.

      Open a box to drill into the diagram beneath it; the echo-host box opens a third level.

      ${embed('Data stack', drawings.data)}

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
    `,
  });

  const composer = Markdown.make({
    name: 'Composer',
    content: trim`
      # Composer

      A local-first workspace of plugins: the app framework composes core and feature plugins over React UI, on the ${link('DXOS', dxos)} SDK, and syncs and runs remote compute through ${link('EDGE', edge)}.

      Local-first means the data lives on the device. Composer reads and writes a local database, works offline, and syncs when it can. The same code runs in the browser, as a desktop app under Tauri and on mobile; the plugin set differs between them.

      Open a box to drill into the diagram beneath it; the EDGE box opens the EDGE architecture.

      ${embed('Composer architecture', drawings.composer)}

      ## Reading the code

      Composer is an app framework plus a set of plugins; almost every feature is a plugin, so the code reads from the framework outward.

      Start at the app's entry point, then the framework, then one plugin. The data and compute layers come last, and the ${link('DXOS', dxos)} document covers them in more depth.

      ### The app

      ${code('packages/apps/composer-app')} boots the framework and lists the plugins it ships: the core set in \`plugin-defs.core.tsx\`, which the app cannot run without, and the rest in \`plugin-defs.tsx\`.

      \`src/main.tsx\` collects the plugins with \`getPlugins\` and the ones enabled by default with \`getDefaults\`, then hands both to the framework's \`useApp\` hook. The core set includes the client, the graph, the navigation tree and the layout, which is \`DeckPlugin\` on desktop and \`MobilePlugin\` on a phone. Mobile and production builds have their own lists in \`plugin-defs.mobile.tsx\` and \`plugin-defs.production.tsx\`. The services run in a dedicated worker started from \`src/workers\`.

      ### The framework

      ${code('packages/sdk/app-framework')} is a plugin manager. A plugin is a set of modules, each activated by an event and each contributing *capabilities*: surfaces that render an object in a role, operations that act on one, settings, and the services the rest of the app looks up by type. Nothing calls a plugin directly; the framework finds what plugins contribute. ${code('packages/sdk/app-toolkit')} holds the contracts plugins share (surfaces, layout operations, space templates like this one).

      Activation events are values such as \`Startup\`, \`Idle\` and \`SurfacesRequested(role)\` in \`src/common/activation-events.ts\`. When one fires, the \`PluginManager\` activates the modules waiting on it. The activation graph (\`activation-graph.ts\`) orders them so a module that requires a singleton capability starts after its provider. Capabilities are typed tags made with \`Capability.make\` or \`Capability.makeSingleton\`, and a module reads them with \`Capability.get\` or \`Capability.getAll\`. Common tags live in \`Capabilities\`, such as \`ReactSurface\`, \`OperationHandler\` and \`ProcessManager\`. App-level ones live in the toolkit's \`AppCapabilities\`, such as \`AppGraphBuilder\`, \`Settings\` and \`SpaceTemplate\`.

      ### Plugin registry

      Each plugin under ${code('packages/plugins')} has the same anatomy: \`plugin.tsx\` names its modules, \`capabilities/\` contributes them, \`containers/\` are the surfaces, \`types/\` its ECHO schema, and \`PLUGIN.mdl\` states what it does. The UI is built from ${code('packages/ui/react-ui')}.

      This plugin, ${code('packages/plugins/plugin-canvas')}, is an example. \`CanvasPlugin.ts\` holds only \`meta\` and a \`Plugin.lazy\` constructor, so the app lists the plugin without loading its body. \`plugin.tsx\` builds it with \`Plugin.define(meta)\` and one \`Plugin.addModule\` per capability. Each module in \`capabilities/index.ts\` lazy-imports its file and declares when it activates; the settings and operation handler, for example, wait for \`Idle\`. A handler module contributes an \`OperationHandlerSet\` to \`Capabilities.OperationHandler\`, and a surface module contributes \`Surface.create\` entries to \`Capabilities.ReactSurface\`.

      ### Data and compute

      Plugins read and write ECHO objects through the client, which the ${link('DXOS', dxos)} document walks through. Operations run in a process manager (${code('packages/core/compute')}); one that names a remote runtime runs on ${link('EDGE', edge)} instead.

      An operation is a typed definition with input and output schemas, made in ${code('packages/core/compute/compute')}, and its handler is registered separately. \`ProcessManager\` in ${code('packages/core/compute/compute-runtime')} runs each invocation as a process and records its trace. An invocation with \`on: 'edge'\` goes through \`EdgeOperationInvoker\` (${code('packages/core/compute/edge-compute')}) to EDGE's compute service. The assistant is built on the same layer: ${code('packages/core/compute/assistant')} calls the model through ${code('packages/core/compute/ai')} and reaches MCP tools through \`mcp-client\`.
    `,
  });

  return { composer, dxos, edge };
};
