//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';

import { matchesFilter } from './filter.ts';

describe('matchesFilter', () => {
  const plugin = Plugin.make(
    Plugin.define({
      profile: { key: 'org.dxos.plugin.review', name: 'Review', description: 'Comment threads anchored to objects.' },
    }),
  )();

  test('matches the key, name and description', ({ expect }) => {
    expect(matchesFilter(plugin, 'plugin.review')).toBe(true);
    expect(matchesFilter(plugin, 'review')).toBe(true);
    expect(matchesFilter(plugin, 'anchored')).toBe(true);
  });

  test('rejects text found in none of them', ({ expect }) => {
    expect(matchesFilter(plugin, 'spreadsheet')).toBe(false);
  });
});
