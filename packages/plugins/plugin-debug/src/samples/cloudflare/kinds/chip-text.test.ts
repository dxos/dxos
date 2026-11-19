//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatChips, parseChips } from './Chip.tsx';

describe('chips as text', () => {
  test('a row of chips survives being written down', ({ expect }) => {
    // The notes are the hard part: one holds a space, another holds two colons, and neither may split a chip.
    const chips = {
      items: [
        { icon: 'shield-check', label: 'Validation', note: 'every write' },
        { icon: 'link', label: 'URI', note: 'dxn:type:org.dxos/Task' },
        { icon: 'database', label: 'ECHO', tone: 'accent' },
      ],
    } as const;
    const text = formatChips(chips as any);
    expect(parseChips(text).items).toEqual(chips.items);
    expect(formatChips(parseChips(text))).toEqual(text);
  });
});
