//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.debug',
    name: 'Debug',
    author: 'DXOS',
    description: trim`
      DebugPlugin is the developer toolkit for DXOS Composer. It adds a structured Devtools node
      to the navigation graph — grouped into Client, HALO, ECHO, Mesh, and EDGE sub-sections —
      exposing panel views for config, storage, logs, diagnostics, identity, devices, feeds,
      objects, schemas, automerge internals, network topology, EDGE workflows, and invocation
      traces, all driven by the @dxos/devtools component library.

      The plugin contributes a Debug companion tab to every ECHO object in the deck so developers
      can inspect raw field values and DXNs inline, and a Space Objects companion panel that lists
      all objects in the active space with live reactive updates.

      Test-data generation is available via a SpaceGenerator article surface: developers can
      create configurable batches of synthetic ECHO objects into any space collection, with a
      status indicator showing when generation is running.

      Additional utilities include a wireframe overlay mode that draws labelled borders around
      every article and section surface, a log-capture and download facility backed by an
      IdbLogStore, a ToolsExplorer connected to the DXOS MCP introspect service, and a
      globalThis helper for manual storage-version testing.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-debug',
    icon: { key: 'ph--bug--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    screenshots: [{ dark: 'https://dxos.network/plugin-details-debug-dark.png' }],
  },
});
