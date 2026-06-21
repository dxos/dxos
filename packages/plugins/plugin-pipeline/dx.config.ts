//
// Copyright 2023 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.pipeline',
    name: 'Pipelines',
    author: 'DXOS',
    description: trim`
      A multi-column Kanban-style pipeline plugin for DXOS Composer.
      Each Pipeline holds an ordered set of Columns; each Column is backed by a ViewModel whose query
      can select any ECHO object type — messages, contacts, documents, or custom types — from the active space.

      Columns are fully configurable through the Settings companion panel, where users can add, rename,
      reorder, and delete columns and edit the underlying query and projection for each column.
      Objects can be dragged between columns and the full pipeline state, including column order and
      per-column item order, persists collaboratively via ECHO.

      A built-in Research template scaffolds a four-column pipeline wired to the Mailbox, Contacts,
      Organizations, and Notes objects in the space, providing an out-of-the-box CRM-style workflow.
      Pipeline articles also expose Invocations and Automation companion tabs for AI-driven automation.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-pipeline',
    icon: { key: 'ph--path--regular', hue: 'purple' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
