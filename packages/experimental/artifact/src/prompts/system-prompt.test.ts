//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createSystemPrompt } from './system-prompt';

describe('prompt', () => {
  test('should be able to process a template', ({ expect }) => {
    const prompt = createSystemPrompt({ artifacts: ['Create a test artifact.'] });
    expect(prompt).to.exist;
  });
});
