//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createPromptContent } from './prompt';

describe('createPromptContent', () => {
  test('returns the bare message when there is no context', ({ expect }) => {
    expect(createPromptContent({ message: 'hello' })).toBe('hello');
    expect(createPromptContent({ message: 'hello', context: {} })).toBe('hello');
  });

  test('prepends a synthetic selection block before the user prompt', ({ expect }) => {
    const content = createPromptContent({
      message: 'Summarize this.',
      context: { selection: { anchors: ['a:b'], text: 'lorem ipsum' } },
    });
    if (typeof content === 'string') {
      throw new Error('expected content blocks');
    }
    expect(content).toHaveLength(2);
    const [selectionBlock, promptBlock] = content;
    if (selectionBlock._tag !== 'text' || promptBlock._tag !== 'text') {
      throw new Error('expected text blocks');
    }
    expect(selectionBlock.disposition).toBe('synthetic');
    expect(selectionBlock.text).toContain('lorem ipsum');
    expect(promptBlock.disposition).toBeUndefined();
    expect(promptBlock.text).toBe('Summarize this.');
  });

  test('empty selection text falls back to the bare message', ({ expect }) => {
    expect(createPromptContent({ message: 'hi', context: { selection: { anchors: [], text: '' } } })).toBe('hi');
  });
});
