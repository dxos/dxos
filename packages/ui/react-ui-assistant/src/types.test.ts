//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type LaneCardData, parseLaneCards } from './types.ts';

describe('parseLaneCards', () => {
  const card: LaneCardData = {
    lane: { id: 'pricing', hue: 'emerald', status: 'done', started: '2026-01-01T00:00:00.000Z' },
    lines: [{ role: 'assistant', text: 'Done.' }],
  };

  test('reads the cards of a well-formed row', ({ expect }) => {
    expect(parseLaneCards(JSON.stringify([card]))).toEqual([card]);
  });

  test.for(['not json', '{}', '[{}]', '[{"lane":{}}]', '[{"lane":{"id":"a"},"lines":[]}]'])(
    'a malformed row has no cards: %s',
    (text, { expect }) => {
      expect(parseLaneCards(text)).toEqual([]);
    },
  );

  test('a row with no text has no cards', ({ expect }) => {
    expect(parseLaneCards(undefined)).toEqual([]);
  });
});
