//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { matchesAny } from './glob.ts';

describe('matchesAny', () => {
  test('`**/` spans any number of directories, including none', ({ expect }) => {
    expect(matchesAny(['**/*.mdl'], 'PLUGIN.mdl')).toBe(true);
    expect(matchesAny(['**/*.mdl'], 'packages/plugins/plugin-code/PLUGIN.mdl')).toBe(true);
    expect(matchesAny(['**/*.mdl'], 'packages/README.md')).toBe(false);
  });

  test('`*` stays within one directory', ({ expect }) => {
    expect(matchesAny(['packages/*/PLUGIN.mdl'], 'packages/plugin-code/PLUGIN.mdl')).toBe(true);
    expect(matchesAny(['packages/*/PLUGIN.mdl'], 'packages/plugins/plugin-code/PLUGIN.mdl')).toBe(false);
    expect(matchesAny(['packages/plugins/**'], 'packages/plugins/plugin-code/PLUGIN.mdl')).toBe(true);
  });

  test('other characters are literal', ({ expect }) => {
    expect(matchesAny(['a.mdl'], 'aXmdl')).toBe(false);
    expect(matchesAny(['spec/(draft).mdl'], 'spec/(draft).mdl')).toBe(true);
  });
});
