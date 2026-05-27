//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.sketch'),
  name: 'Sketch',
  author: 'DXOS',
  description: trim`
    Sketch is a collaborative whiteboard plugin for DXOS Composer that gives every workspace a
    full-featured infinite canvas. Draw freehand strokes, place geometric shapes, add text and
    arrows, and organise ideas visually — all within the same local-first environment as the rest
    of your documents.

    The drawing surface is powered by tldraw, a best-in-class open-source canvas library. Each
    Sketch object owns a Canvas whose content is stored as a plain JSON record in ECHO, so no
    binary blobs or external storage are required. Toolbar actions, grid settings, and custom
    tools are wired through the Composer plugin system.

    Because Canvas data lives in ECHO, every edit is replicated peer-to-peer in real time.
    Collaborators see each other's strokes as they draw, and changes made offline merge
    automatically when connectivity is restored using ECHO's CRDT semantics.

    Sketches integrate naturally with the rest of Composer. They appear as first-class objects
    in the space graph, support comment threads anchored to selections, and render in article,
    section, and slide roles — adapting their toolbar and zoom behaviour to each context.
    An agent-callable createSketch operation lets AI workflows generate or pre-populate
    whiteboards programmatically.
  `,
  icon: 'ph--compass-tool--regular',
  iconHue: 'indigo',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sketch',
  spec: 'PLUGIN.mdl',
  screenshots: ['https://dxos.network/plugin-details-sketch-dark.png'],
};
