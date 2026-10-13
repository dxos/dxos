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

      Open a service to drill into its diagram; db-service's replication opens a third level.

      ${embed('EDGE architecture', drawings.edge)}

      ## Reading the code

      EDGE lives in its own repository, \`dxos/edge\`, as one Cloudflare worker per service under \`packages/services\`. Each service's \`wrangler.jsonc\` is the place to start: it names the worker, its Durable Objects and the bindings it calls other services through.

      ### The front door

      \`edge\` is the router worker every client talks to. Its Hono API (\`src/api.ts\`) mounts the realtime routes and proxies each path prefix (\`/db\`, \`/functions\`, \`/kms\` …) to the service behind it. The \`router\` service holds the live connections: one \`RouterObject\` Durable Object per identity keeps that identity's device WebSockets, and \`SwarmObject\` tracks who is in which swarm. A message for a device, from any service, goes through \`ROUTER_MESSENGER\` to that device's \`RouterObject\`.

      ### Accounts

      \`hub-service\` holds accounts and passkey login. The router asks it who a connection belongs to before it lets anything through.

      ### Data

      \`db-service\` is the server half of ECHO. A space's replication runs in a Durable Object: the \`SubductionHandler\` takes the frames a client sends, its \`AutomergeReplicator\` merges them, and \`SedimentreeStore\` keeps the result in the object's storage. The \`Indexer\` reads the merged documents to answer queries, and \`SpaceMetadata\` backs the space up to R2. The replicator's lifecycle, including what happens when an instance is evicted, is specified in \`subduction/replication-spec.md\`; the round trip is drawn in the DXOS document.

      ### Compute

      \`compute-service\` runs the functions a space deploys. Its \`FunctionInvoker\` runs one when it is called, when a trigger's scheduler fires, or as a workflow step, and hands it the db, ai and kms services. Composer reaches it through the same router, under \`/functions\`.
    `,
  });

  const dxos = Markdown.make({
    name: 'DXOS',
    content: trim`
      # DXOS

      The SDK Composer is built on. The client runs in the app and proxies a service stack in a worker: HALO keeps the identity, ECHO the spaces' objects as Automerge documents with indexes and queues over SQLite on OPFS, and MESH the peer network. The EDGE replicator keeps a space in sync with ${link('EDGE', edge)}.

      Open a box to drill into the diagram beneath it; the echo-host box opens a third level.

      ${embed('Data stack', drawings.data)}

      ## Reading the code

      Read the diagram top to bottom: the app holds a proxy of every space, and the real data lives in a worker that one tab hosts, elected through a lock, and every open tab talks to.

      ### Client

      ${code('packages/sdk/client')} is the entry point an app creates; ${code('packages/sdk/react-client')} wraps it in hooks. The objects an app edits are proxies from ${code('packages/core/echo/echo-client')}: a change made with \`Obj.update\` lands in the object's Automerge document through a \`DocHandleProxy\`, and \`RepoProxy\` batches those changes to the worker. The schema API (\`Obj\`, \`Type\`, \`Ref\`, \`Filter\`) is ${code('packages/core/echo/echo')}.

      ### Services

      ${code('packages/sdk/client-services')} builds the service stack in the worker. ${code('packages/core/echo/echo-host')} is ECHO's host: \`DataService\` takes the client's batches and hands them to \`DocumentsSynchronizer\`, which applies them to the \`AutomergeHost\`. The host persists every document to SQLite on OPFS (${code('packages/common/sql-sqlite')}), indexes it for queries (${code('packages/core/echo/index-core')}), and keeps queues in ${code('packages/core/echo/feed')}. Identity and credentials are HALO (${code('packages/core/halo')}); peer networking is MESH (${code('packages/core/mesh')}).

      ### Sync

      \`EchoEdgeSubductionReplicator\` (${code('packages/core/echo/echo-host/src/edge')}) replicates each space's documents with EDGE over the WebSocket that \`EdgeClient\` (${code('packages/core/mesh/edge-client')}) keeps open. EDGE stores the space and forwards a change to the identity's other devices, so two devices converge through EDGE even when they are never online together.

      ## An edit, end to end

      The path a change takes from one device to another, through the boxes of this diagram and the EDGE one:

      ${FENCE}mermaid
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
    `,
  });

  const composer = Markdown.make({
    name: 'Composer',
    content: trim`
      # Composer

      A local-first workspace of plugins: the app framework composes core and feature plugins over React UI, on the ${link('DXOS', dxos)} SDK, and syncs and runs remote compute through ${link('EDGE', edge)}.

      Open a box to drill into the diagram beneath it; the EDGE box opens the EDGE architecture.

      ${embed('Composer architecture', drawings.composer)}

      ## Reading the code

      Composer is an app framework plus a set of plugins; almost every feature is a plugin, so the code reads from the framework outward.

      ### The app

      ${code('packages/apps/composer-app')} boots the framework and lists the plugins it ships: the core set in \`plugin-defs.core.tsx\`, which the app cannot run without, and the rest in \`plugin-defs.tsx\`.

      ### The framework

      ${code('packages/sdk/app-framework')} is a plugin manager. A plugin is a set of modules, each activated by an event and each contributing *capabilities*: surfaces that render an object in a role, operations that act on one, settings, and the services the rest of the app looks up by type. Nothing calls a plugin directly; the framework finds what plugins contribute. ${code('packages/sdk/app-toolkit')} holds the contracts plugins share (surfaces, layout operations, space templates like this one).

      ### A plugin

      Each plugin under ${code('packages/plugins')} has the same anatomy: \`plugin.tsx\` names its modules, \`capabilities/\` contributes them, \`containers/\` are the surfaces, \`types/\` its ECHO schema, and \`PLUGIN.mdl\` states what it does. The UI is built from ${code('packages/ui/react-ui')}.

      ### Data and compute

      Plugins read and write ECHO objects through the client, which the ${link('DXOS', dxos)} document walks through. Operations run in a process manager (${code('packages/core/compute')}); one that names a remote runtime runs on ${link('EDGE', edge)} instead.
    `,
  });

  return { composer, dxos, edge };
};
