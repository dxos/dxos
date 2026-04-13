//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.spacetime',
  name: 'Spacetime',
  description: trim`
    Generative 3D modeling and animation plugin.
    Create and manipulate solid geometry with boolean operations, extrusion, and real-time collaboration.
  `,
  icon: 'ph--cube--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-spacetime',
};
