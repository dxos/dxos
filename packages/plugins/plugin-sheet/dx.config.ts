//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.sheet',
    name: 'Sheet',
    description: trim`
      Full-featured spreadsheet for DXOS Composer backed by ECHO for local-first, real-time collaborative editing.
      Cells, row/column metadata, and range-based formatting are all stored as ECHO objects and replicated to peers instantly.

      Formula evaluation is powered by HyperFormula, providing over 400 built-in functions covering arithmetic, statistics,
      text manipulation, date/time, financial, and logical operations. Formulas are stored with internal cell indices and
      translated to A1-notation on display, keeping references stable across row and column insertions.

      The plugin integrates with plugin-markdown to expose formula results inside document fenced code blocks, and
      contributes anchor-navigation support so other plugins can scroll and highlight specific cell ranges by DXN reference.
      AI agents can invoke sheet operations — insert/drop axes, scroll to anchor, and read or write cell values — through
      the standard operations framework.
    `,
    icon: { key: 'ph--grid-nine--regular', hue: 'indigo' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sheet',
    spec: 'PLUGIN.mdl',
    screenshots: [{ dark: 'https://dxos.network/plugin-details-sheet-dark.png' }],
  },
});
