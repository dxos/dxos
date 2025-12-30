//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/mermaid',
  name: 'Mermaid',
  description: trim`
    Generate diagrams from simple text-based definitions using Mermaid syntax.
    Create flowcharts, sequence diagrams, and other visualizations that stay in sync with your documentation.
  `,
  icon: 'ph--anchor-simple--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-mermaid',
};
