//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.spacetime', '0.8.3'),
  name: 'Spacetime',
  author: 'DXOS',
  description: trim`
    A generative 3D modeling and animation plugin for DXOS Composer.
    Uses Babylon.js for real-time rendering with an ArcRotateCamera, HemisphericLight, and a toggleable ground-plane grid.
    Solid geometry is handled by Manifold (WASM), enabling constructive solid geometry (CSG) operations
    such as boolean union and ordered subtraction directly in the browser.

    Each Spacetime article is backed by a Scene ECHO object that holds an ordered collection of Object Refs.
    Objects store their geometry as either a named primitive (cube, sphere, cylinder, cone, pyramid) or
    serialized mesh data (base64-encoded vertex positions and triangle indices), along with position,
    scale, rotation, and color. All state persists and replicates collaboratively via ECHO.

    Three interactive tools are available: Select (pick objects or coplanar face groups), Move
    (translate along the XZ ground plane or Y axis with optional grid snap), and Extrude
    (push/pull a selected face along its normal using Manifold's warp function with real-time preview).
    The plugin also supports importing GLB/GLTF and OBJ files and exporting selected objects as binary STL.
  `,
  icon: 'ph--cube--regular',
  iconHue: 'teal',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-spacetime',
  spec: 'PLUGIN.mdl',
  tags: ['labs'],
});
