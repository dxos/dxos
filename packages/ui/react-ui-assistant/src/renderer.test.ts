//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { ContentBlock, Message } from '@dxos/types';

import { createRenderer } from './renderer';

const userMessage = (blocks: ContentBlock.Any[]) =>
  Message.make({ created: '2026-01-01T00:00:00.000Z', sender: { role: 'user' }, blocks });

const render = (message: Message.Message, viewType: Parameters<typeof createRenderer>[0] = 'normal') => {
  const content = createRenderer(viewType)(message);
  return content.kind === 'markdown' ? content.text : '';
};

describe('createRenderer', () => {
  test('a prompt carrying synthetic context renders only the reader words', () => {
    const text = render(
      userMessage([
        ContentBlock.Text.make({ text: 'the selection', disposition: 'synthetic' }),
        ContentBlock.Text.make({ text: 'summarize this' }),
      ]),
    );

    // The context is the chrome's panel, so the body must not repeat it.
    expect(text).toContain('summarize this');
    expect(text).not.toContain('the selection');
  });

  // A message the renderer maps to nothing is dropped as an empty row, so a synthetic-only turn
  // (a trigger, the planning skill's continuation nudge) used to vanish — leaving the answer to it
  // reading as though the assistant had spoken unprompted.
  test('a synthetic-only turn renders as its own panel rather than nothing', () => {
    const text = render(userMessage([ContentBlock.Text.make({ text: 'keep going', disposition: 'synthetic' })]));

    expect(text).toBe('<synthetic>keep going</synthetic>');
  });

  test('the summary view still hides synthetic turns', () => {
    const text = render(
      userMessage([ContentBlock.Text.make({ text: 'keep going', disposition: 'synthetic' })]),
      'summary',
    );

    expect(text).toBe('');
  });
});
