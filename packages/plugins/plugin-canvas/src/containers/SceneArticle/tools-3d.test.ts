//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { CREATE_GROUP, HAND_ICON, SELECT_ICON } from '@dxos/react-ui-canvas';

import { TOOL_GROUPS_3D } from './tools-3d.ts';

describe('3D tools', () => {
  test("Select and Orbit take the 2D rail's Select and hand icons", () => {
    const entries = TOOL_GROUPS_3D.flatMap((group) => group.entries);
    expect(entries.find((entry) => entry.id === 'select')?.icon).toBe(SELECT_ICON);
    expect(entries.find((entry) => entry.id === 'orbit')?.icon).toBe(HAND_ICON);
  });

  test('Extrude follows Scale in the transform group, and Link sits with the shapes in the create group', () => {
    const ids = (name: string) => TOOL_GROUPS_3D.find((group) => group.name === name)?.entries.map((entry) => entry.id);
    expect(ids('Transform')).toEqual(['move', 'rotate', 'scale', 'extrude']);
    expect(ids(CREATE_GROUP)).toEqual(['cube', 'sphere', 'cylinder', 'cone', 'link']);
  });
});
