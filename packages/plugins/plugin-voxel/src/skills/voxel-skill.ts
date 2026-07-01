//
// Copyright 2026 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { VoxelOperation } from '#types';

const SKILL_KEY = 'dxos.org/skill/voxel';

const operations = [
  VoxelOperation.AddVoxels,
  VoxelOperation.GenerateShape,
  VoxelOperation.QueryWorld,
  VoxelOperation.RemoveVoxels,
];

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Voxel',
    tools: Skill.toolDefinitions({ operations }),
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

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
