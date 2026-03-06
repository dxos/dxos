//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'dxos.org/plugin/voxel',
  name: 'Voxel',
  description: trim`
    A 3D voxel editor for creating and editing block-based 3D worlds.
    Place, remove, and color voxels in an interactive 3D environment with orbit controls.
  `,
  icon: 'ph--cube--regular',
};
