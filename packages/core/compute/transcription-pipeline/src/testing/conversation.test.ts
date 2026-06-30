//
// Copyright 2024 DXOS.org
//

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { describe, test } from 'vitest';

import { parseConversation } from './conversation-parser';
import { simulateStream } from './stream-simulator';

const fixture = () =>
  fs.readFileSync(path.join(path.dirname(url.fileURLToPath(import.meta.url)), 'conversation.txt'), 'utf8');

describe('conversation fixture', () => {
  test('parses entities + speaker-tagged utterances', ({ expect }) => {
    const conversation = parseConversation(fixture());
    expect(conversation.speakers).toEqual(['A', 'B']);
    expect(conversation.utterances.length).toBe(7);
    expect(conversation.entities.map((entity) => entity.fields.fullName ?? entity.fields.name)).toContain('Chad');
    expect(conversation.entities.map((entity) => entity.fields.name)).toContain('Blue Yard');
  });

  test('simulates a chronological, per-utterance batch schedule', ({ expect }) => {
    const conversation = parseConversation(fixture());
    const batches = simulateStream(conversation, { wordsPerSecond: 2.5, gapSeconds: 0.5 });

    expect(batches.length).toBe(conversation.utterances.length);
    expect(batches[0].offsetMs).toBe(0);
    expect(batches.every((batch) => batch.blocks.length > 0)).toBe(true);
    // Offsets are strictly increasing (chronological delivery).
    for (let index = 1; index < batches.length; index++) {
      expect(batches[index].offsetMs).toBeGreaterThan(batches[index - 1].offsetMs);
    }
  });

  test('merges consecutive same-speaker utterances when batchSeconds is set', ({ expect }) => {
    const conversation = {
      entities: [],
      speakers: ['A', 'B'],
      utterances: [
        { speaker: 'A', text: 'one two three' },
        { speaker: 'A', text: 'four five six' },
        { speaker: 'B', text: 'seven eight' },
      ],
    };
    // A large window coalesces the two consecutive A turns into one batch (A, B).
    const merged = simulateStream(conversation, { batchSeconds: 60 });
    expect(merged.length).toBe(2);
    expect(merged[0].blocks.length).toBe(2);
  });
});
