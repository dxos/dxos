//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { extractNotes, getSpeakerLines } from './notes.ts';

describe('extractNotes', () => {
  test('reads the trailing comment', ({ expect }) => {
    expect(extractNotes('# Title\n\nBody\n\n<!--\nSay hello.\n-->\n')).toBe('Say hello.');
  });

  test('ignores a comment that is not last', ({ expect }) => {
    expect(extractNotes('<!-- earlier -->\n# Title')).toBeUndefined();
  });

  test('an empty comment is no notes', ({ expect }) => {
    expect(extractNotes('# Title\n<!--   -->')).toBeUndefined();
  });
});

describe('getSpeakerLines', () => {
  test('no notes, no lines', ({ expect }) => {
    expect(getSpeakerLines(undefined)).toEqual([]);
    expect(getSpeakerLines('  \n ')).toEqual([]);
  });

  test('one line per bullet, joining wrapped lines', ({ expect }) => {
    const notes = ['- Enterprise data has been siloed', '  for decades;', '- But agents need a unified view.'].join(
      '\n',
    );
    expect(getSpeakerLines(notes)).toEqual([
      'Enterprise data has been siloed for decades;',
      'But agents need a unified view.',
    ]);
  });

  test('splits sentences so a breath falls at each line end', ({ expect }) => {
    expect(getSpeakerLines('First point. Second point! Is it third? Yes')).toEqual([
      'First point.',
      'Second point!',
      'Is it third?',
      'Yes',
    ]);
  });

  test('paragraphs and numbered items', ({ expect }) => {
    expect(getSpeakerLines('Opening line\nstill opening.\n\n1. One\n2) Two')).toEqual([
      'Opening line still opening.',
      'One',
      'Two',
    ]);
  });
});
