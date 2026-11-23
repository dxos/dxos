//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LIBRARY_ITEMS } from './library.ts';

describe('library', () => {
  test.each(LIBRARY_ITEMS.map((item) => [item.id, item] as const))(
    'the %s is defined five units long, so it is placed at a vehicle size beside the unit shapes',
    async (_, item) => {
      const object = await item.make();
      expect(object).toMatchObject({ type: 'mesh', scale: { x: 5, y: 5, z: 5 } });
    },
  );

  test.each(LIBRARY_ITEMS.map((item) => [item.id, item] as const))(
    'the %s keeps its proportions, so a drag or a scale sizes it evenly',
    async (_, item) => {
      await expect(item.make()).resolves.toMatchObject({ lockAspect: true });
    },
  );
});
