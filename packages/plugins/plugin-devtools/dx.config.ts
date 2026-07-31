//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.devtools',
    name: 'Devtools',
    author: 'DXOS',
    description: trim`
      DevtoolsPlugin is the developer inspector for DXOS Composer. It adds a structured Devtools node
      to the navigation graph — grouped into Client, HALO, ECHO, Mesh, and EDGE sub-sections —
      exposing panel views for config, storage, logs, diagnostics, identity, devices, feeds,
      objects, schemas, automerge internals, network topology, EDGE workflows, and invocation
      traces, all driven by the @dxos/devtools component library.

      Additional utilities include an app-graph inspector, a ToolsExplorer connected to the DXOS MCP
      introspect service, and a globalThis helper for manual storage-version testing.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-devtools',
    icon: { key: 'ph--toolbox--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
