//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ChipList, formatChips, parseChips } from './Chip.tsx';

describe('chips as text', () => {
  test('a row of chips survives being written down', ({ expect }) => {
    // The notes are the hard part: one holds a space, another holds two colons, and neither may split a chip.
    const chips: ChipList = {
      items: [
        { icon: 'shield-check', label: 'Validation', note: 'every write' },
        { icon: 'link', label: 'URI', note: 'dxn:type:org.dxos/Task' },
        { icon: 'database', label: 'ECHO', tone: 'accent' },
      ],
    };
    const text = formatChips(chips);
    expect(text).toEqual(
      'shield-check~Validation~every write | link~URI~dxn:type:org.dxos/Task | database~ECHO~~accent',
    );
    expect(parseChips(text).items).toEqual(chips.items);
    expect(formatChips(parseChips(text))).toEqual(text);
  });

  test('a ghost chip stays a ghost, with or without a tone', ({ expect }) => {
    const chips: ChipList = {
      items: [
        { icon: 'cloud', label: 'Compute', ghost: true },
        { icon: 'cloud', label: 'Hub', tone: 'teal', ghost: true },
      ],
    };
    const text = formatChips(chips);
    expect(text).toEqual('cloud~Compute~~~ghost | cloud~Hub~~teal~ghost');
    expect(parseChips(text).items).toEqual(chips.items);
  });

  test('a separator inside a label or a note is escaped, and read back', ({ expect }) => {
    const chips: ChipList = {
      items: [
        { icon: 'function', label: 'A | B', note: 'x ~ y' },
        { icon: 'path', label: 'C:\\d', note: 'ends in ~' },
      ],
    };
    const text = formatChips(chips);
    expect(parseChips(text).items).toEqual(chips.items);
    expect(formatChips(parseChips(text))).toEqual(text);
  });

  test('a backslash before any other character is kept', ({ expect }) => {
    expect(parseChips('path~File~C:\\data~accent').items).toEqual([
      { icon: 'path', label: 'File', note: 'C:\\data', tone: 'accent' },
    ]);
  });

  test('a tone the deck does not have is dropped', ({ expect }) => {
    expect(parseChips('database~ECHO~~unknown').items).toEqual([{ icon: 'database', label: 'ECHO' }]);
  });
});
