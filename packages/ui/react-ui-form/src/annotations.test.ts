//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { iconOptions } from './annotations.ts';

describe('iconOptions', () => {
  test("offers the DXOS mark by its own symbol, ahead of Phosphor's glyphs by name", async ({ expect }) => {
    const options = await EffectEx.runPromise(iconOptions().load({}));
    expect(options[0]).toEqual({ value: 'dx--dxos--regular', label: 'dxos', icon: 'dx--dxos--regular' });
    // A Phosphor glyph is offered by its bare name, which a consumer makes a symbol of at the weight it wants.
    expect(options.find((option) => option.value === 'rocket')).toEqual({
      value: 'rocket',
      label: 'rocket',
      icon: 'ph--rocket--regular',
    });
    expect(options.length).toBeGreaterThan(1000);
    expect(options.filter((option) => option.value.includes('dxos'))).toHaveLength(1);
  });
});
