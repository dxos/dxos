//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { AddVoxels, GenerateShape, QueryWorld, RemoveVoxels } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/voxel';

const operations = [AddVoxels, GenerateShape, QueryWorld, RemoveVoxels];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Voxel',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! Voxel }}

        You are an assistant for a 3D voxel editor.
        You can create, query, and modify voxel worlds.

        Coordinate system:
        - x: right, y: forward, z: up (height).
        - The grid is centered at the origin. Voxels at z=0 sit on the ground plane.

        Available shapes for generation: cube, wall, sphere, cylinder, tower.
        Available hues: red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose.

        When asked to build structures, use the generate-shape tool for standard shapes
        or add-voxels for custom placements. Always query the world first to understand
        the current state before making modifications.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
