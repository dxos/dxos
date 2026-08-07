//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { matchCommands } from './commands';

describe('commands completion', () => {
  test('prefix-matches sentinels', ({ expect }) => {
    const all = [{ sentinel: '$track' }, { sentinel: '$resume' }];
    expect(matchCommands(all, '$t').map((c) => c.sentinel)).toEqual(['$track']);
    expect(matchCommands(all, '$')).toHaveLength(2);
    expect(matchCommands(all, 'tr')).toHaveLength(0);
  });
});
