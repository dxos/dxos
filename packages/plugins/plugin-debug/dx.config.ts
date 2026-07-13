//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.debug',
    name: 'Debug',
    author: 'DXOS',
    description: trim`
      DebugPlugin bundles developer debugging utilities for DXOS Composer under a Debug node in the
      SYSTEM navigation group (a sibling of the Devtools inspector).

      Test-data generation is available via a SpaceGenerator article surface: developers can
      create configurable batches of synthetic ECHO objects into any space collection, with a
      status indicator showing when generation is running.

      The plugin contributes a Debug companion tab to every ECHO object in the deck so developers
      can inspect raw field values and DXNs inline, and a Space Objects companion panel that lists
      all objects in the active space with live reactive updates.

      Additional utilities include a wireframe overlay mode that draws labelled borders around
      every article and section surface, a log-capture and download facility backed by an
      IdbLogStore, and a transient-stats panel for live telemetry.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-debug',
    icon: { key: 'ph--bug--regular' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
