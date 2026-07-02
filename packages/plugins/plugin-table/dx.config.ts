//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.table',
    name: 'Tables',
    author: 'DXOS',
    description: trim`
      Tables brings structured, spreadsheet-style data views to DXOS Composer.
      Any ECHO schema type can be bound to a Table, giving users a familiar grid interface
      for browsing, creating, and editing objects stored in a local-first collaborative space.

      Columns are derived automatically from the schema's fields and persisted in a View object
      alongside the table. Rows can be inserted inline, sorted by column, filtered by tag or
      global search, and deleted with multi-row selection — all changes are replicated in
      real-time across peers via ECHO.

      The plugin integrates deeply with the Composer lifecycle: a default Task table is created
      when a new space is initialised, and a table is automatically opened whenever a new schema
      type is added to a space. An AI skill lets agents create and populate tables
      programmatically using the plugin's operation set.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-table',
    icon: { key: 'ph--table--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    screenshots: [{ dark: 'https://dxos.network/plugin-details-tables-dark.png' }],
  },
});
