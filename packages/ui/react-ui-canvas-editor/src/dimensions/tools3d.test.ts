//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { HAND_ICON, SELECT_ICON } from '@dxos/react-ui-canvas';

import { TOOLS_3D, fromTool3D, toTool3D } from './tools3d.ts';

describe('3D tools', () => {
  test("Select and Orbit take the 2D rail's Select and hand icons", () => {
    expect(TOOLS_3D.find((tool) => tool.id === 'select')?.icon).toBe(SELECT_ICON);
    expect(TOOLS_3D.find((tool) => tool.id === 'orbit')?.icon).toBe(HAND_ICON);
  });

  test('Extrude follows Scale in the transform group, and Link sits with the shapes in the create group', () => {
    const ids = (category: string) => TOOLS_3D.filter((tool) => tool.category === category).map((tool) => tool.id);
    expect(ids('transform')).toEqual(['move', 'rotate', 'scale', 'extrude']);
    expect(ids('create')).toEqual(['cube', 'sphere', 'cylinder', 'cone', 'link']);
  });

  test('the tool in hand maps to the 3D editor tool and back', () => {
    expect(toTool3D({ id: 'cube' })).toEqual({ create: 'cube' });
    expect(toTool3D({ id: 'place', object: 'gear' })).toEqual({ place: 'gear' });
    expect(toTool3D({ id: 'rotate' })).toBe('rotate');
    expect(toTool3D({ id: 'unknown' })).toBe('select');
    for (const tool of [{ id: 'cube' }, { id: 'place', object: 'gear' }, { id: 'link' }]) {
      expect(fromTool3D(toTool3D(tool))).toEqual(tool);
    }
  });
});
