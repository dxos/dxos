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

/** The three documents that introduce the diagrams: Composer, which links DXOS and EDGE. */
export const makeDocs = (drawings: DocDrawings): Docs => {
  const dxos = Markdown.make({
    name: 'DXOS',
    content: trim`
      # DXOS

      The SDK Composer is built on. The client runs in the app and proxies a service stack in a worker: HALO keeps the identity, ECHO the spaces' objects as Automerge documents with indexes and queues over SQLite on OPFS, and MESH the peer network. The EDGE replicator keeps a space in sync with EDGE.

      Open a box to drill into the diagram beneath it; the echo-host box opens a third level.

      ${embed('Data stack', drawings.data)}
    `,
  });

  const edge = Markdown.make({
    name: 'EDGE',
    content: trim`
      # EDGE

      The DXOS services on Cloudflare. Composer and the hub CLI reach them through the edge router and the hub, which holds accounts. Behind them run the db, compute, identity, kms, ai and blob services, over KV, R2, D1 and queues.

      Open a service to drill into its diagram; db-service's replication opens a third level.

      ${embed('EDGE architecture', drawings.edge)}
    `,
  });

  const composer = Markdown.make({
    name: 'Composer',
    content: trim`
      # Composer

      A local-first workspace of plugins: the app framework composes core and feature plugins over React UI, on the ${link('DXOS', dxos)} SDK, and syncs and runs remote compute through ${link('EDGE', edge)}.

      Open a box to drill into the diagram beneath it; the EDGE box opens the EDGE architecture.

      ${embed('Composer architecture', drawings.composer)}
    `,
  });

  return { composer, dxos, edge };
};
