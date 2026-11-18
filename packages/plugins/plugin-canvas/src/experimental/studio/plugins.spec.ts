//
// Copyright 2026 DXOS.org
//

//
// The Plugins slide: what a plugin contributes, as five columns hanging from the plugin itself, each with the part of
// the system that consumes it underneath.
//

import { type SlideSpec } from './spec.ts';

const part = (id: string, label: string, icon: string, body: string, footer: string) => ({
  id,
  label,
  icon,
  body,
  footer,
});

const consumer = (id: string, label: string, icon: string) => ({ id, label, icon });

export const PLUGINS: SlideSpec = {
  id: 'plugins',
  title: 'Plugins',
  // Wide enough for "UI · agents · MCP" and for two lines of body; the header carries its own body too.
  metrics: { cardWidth: 288, bodyCardHeight: 200, columnGap: 64, headerWidth: 720, headerHeight: 176 },
  groups: [
    {
      id: 'contributions',
      header: {
        id: 'plugin',
        label: 'Plugin',
        icon: 'puzzle-piece',
        body: 'modules load lazily on activation events, in the browser, Node, desktop (Tauri) or at the EDGE (workerd).',
        footer: '106 plugins in dxos/dxos',
      },
      columns: [
        [
          part('types', 'Types', 'brackets-curly', 'Effect Schema types, registered with ECHO.', 'schema · 66'),
          consumer('use-types', 'ECHO', 'database'),
        ],
        [
          part('skills', 'Skills', 'robot', 'Operations offered to agents as tools.', 'skillDefinition · 41'),
          consumer('use-skills', 'Agents', 'sparkle'),
        ],
        [
          part(
            'components',
            'Components',
            'squares-four',
            'React surfaces bound to roles: article, card, section.',
            'surface · 88',
          ),
          consumer('use-components', 'Surface', 'app-window'),
        ],
        [
          part(
            'operations',
            'Operations',
            'function',
            'Typed operations with input and output schemas.',
            'operationHandler · 81',
          ),
          consumer('use-operations', 'UI · agents · MCP', 'plugs-connected'),
        ],
        [
          part('services', 'Services', 'cloud', 'Effect services that run at the EDGE (workerd).', 'layerSpec · 11'),
          consumer('use-services', 'EDGE', 'cloud'),
        ],
      ],
    },
  ],
  // What consumes each contribution, said upwards: the plugin's own wires are the trunks the header makes.
  edges: [
    { from: 'use-types', to: 'types' },
    { from: 'use-skills', to: 'skills' },
    { from: 'use-components', to: 'components' },
    { from: 'use-operations', to: 'operations' },
    { from: 'use-services', to: 'services' },
  ],
  note: 'Counts: plugins in dxos/dxos whose config contributes each module (main, 11 Nov 2026). Every module is optional; a plugin ships only what it needs.',
};
