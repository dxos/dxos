//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createSystemPrompt } from './system-prompt';

describe('prompt', () => {
  test('should be able to create a prompt', ({ expect }) => {
    const prompt = createSystemPrompt({ artifacts: {} });
    console.log(prompt);
    expect(prompt).toBeDefined();
  });
});
