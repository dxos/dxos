//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.voxel'),
  name: 'Voxel',
  author: 'DXOS',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-voxel',
  spec: 'PLUGIN.mdl',
  description: trim`
    A 3D voxel editor for creating, painting, and sculpting block-based 3D worlds directly
    inside DXOS Composer. Worlds are stored as ECHO objects and replicated across peers in
    real-time, making collaborative building seamless and offline-capable.

    The editor runs entirely in the browser via Three.js (react-three-fiber) with no
    server-side rendering required. Users interact with a configurable grid using
    Blender-style orbit controls: middle-click to orbit, Shift+middle to pan, scroll to zoom.
    A ghost cursor previews placement before committing, and a gizmo helper maintains
    spatial orientation.

    Each world supports three tool modes — select, add, and remove — along with a HuePicker
    for coloring voxels with any theme hue. The toolbar also provides one-click shape
    generation (cube, wall, sphere, cylinder, tower) placed at the current cursor position,
    and a full Conway's Game of Life simulation that runs on the ground plane using
    well-known seed patterns such as gliders, spaceships, and the Gosper glider gun.

    Four agent-callable operations expose the world to AI assistants: queryWorld (read the
    full voxel state), addVoxels, removeVoxels, and generateShape. All write operations
    go through ECHO, so changes are immediately visible to every collaborator.
  `,
  icon: 'ph--cube--regular',
  tags: ['labs'],
};
