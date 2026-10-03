//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as Instructions from './Instructions.ts';

describe('Instructions', () => {
  test('commands round-trip through make', ({ expect }) => {
    const instructions = Instructions.make({
      name: 'test',
      commands: [{ sentinel: '$track', description: 'Track a follow-up', prompt: 'Append the item to TASKS.md.' }],
    });
    expect(instructions.commands?.length).toBe(1);
    expect(instructions.commands?.[0].sentinel).toBe('$track');
  });
});
