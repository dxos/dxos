//
// Copyright 2026 DXOS.org
//

//
// The Plugins slide: what a plugin contributes, as five columns hanging from the plugin itself, each with the part of
// the system that consumes it underneath.
//

import { type SlideSpec } from './spec.ts';

const card = (id: string, label: string, icon: string) => ({ id, label, icon });

export const PLUGINS: SlideSpec = {
  id: 'plugins',
  title: 'Plugins',
  // Wide enough for "UI · agents · MCP", which a 224-unit card truncates; the header keeps its half-again width.
  metrics: { cardWidth: 272, headerWidth: 408, columnGap: 96 },
  groups: [
    {
      id: 'contributions',
      header: card('plugin', 'Plugin', 'puzzle-piece'),
      columns: [
        [card('types', 'Types', 'brackets-curly'), card('use-types', 'ECHO', 'database')],
        [card('skills', 'Skills', 'robot'), card('use-skills', 'Agents', 'sparkle')],
        [card('components', 'Components', 'squares-four'), card('use-components', 'Surface', 'app-window')],
        [card('operations', 'Operations', 'function'), card('use-operations', 'UI · agents · MCP', 'plugs-connected')],
        [card('services', 'Services', 'cloud'), card('use-services', 'EDGE', 'cloud')],
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
};
