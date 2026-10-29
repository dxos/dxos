//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { HAND_ICON, SELECT_ICON } from '@dxos/react-ui-canvas';

import { TOOL_GROUPS_3D } from './tools-3d.ts';

describe('3D tools', () => {
  test("Select and Orbit take the 2D rail's Select and hand icons", () => {
    const entries = TOOL_GROUPS_3D.flatMap((group) => group.entries);
    expect(entries.find((entry) => entry.id === 'select')?.icon).toBe(SELECT_ICON);
    expect(entries.find((entry) => entry.id === 'orbit')?.icon).toBe(HAND_ICON);
  });
});
