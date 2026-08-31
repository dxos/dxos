//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ItemContent } from '@dxos/react-ui-feed';
import { ContentBlock, Message } from '@dxos/types';

import { createRenderer } from './renderer';

describe('createRenderer', () => {
  test('a run of tool calls is one panel', ({ expect }) => {
    const render = createRenderer(undefined);
    const rendered = render(
      message([
        { _tag: 'toolCall', toolCallId: '1', name: 'a', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '1', name: 'a', providerExecuted: false, result: 'ok' },
        { _tag: 'toolCall', toolCallId: '2', name: 'b', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '2', name: 'b', providerExecuted: false, result: 'ok' },
      ]),
    );
    expect(toolkitTags(rendered)).toBe(1);
  });

  test('an empty text block between calls does not split the run', ({ expect }) => {
    const render = createRenderer(undefined);
    // What the runtime actually emits around tool calls. Flushing on one produced a panel per call
    // with nothing visible between them.
    const rendered = render(
      message([
        { _tag: 'toolCall', toolCallId: '1', name: 'a', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '1', name: 'a', providerExecuted: false, result: 'ok' },
        { _tag: 'text', text: '' },
        { _tag: 'toolCall', toolCallId: '2', name: 'b', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '2', name: 'b', providerExecuted: false, result: 'ok' },
      ]),
    );
    expect(toolkitTags(rendered)).toBe(1);
  });

  test('prose between calls does split the run, since the reader sees it', ({ expect }) => {
    const render = createRenderer(undefined);
    const rendered = render(
      message([
        { _tag: 'toolCall', toolCallId: '1', name: 'a', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '1', name: 'a', providerExecuted: false, result: 'ok' },
        { _tag: 'text', text: 'Now writing the document.' },
        { _tag: 'toolCall', toolCallId: '2', name: 'b', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '2', name: 'b', providerExecuted: false, result: 'ok' },
      ]),
    );
    expect(toolkitTags(rendered)).toBe(2);
    expect(markdown(rendered)).toContain('Now writing the document.');
  });

  test('a prompt carrying synthetic context renders only the reader words', ({ expect }) => {
    const text = renderUser(
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
  test('a synthetic-only turn renders as its own panel rather than nothing', ({ expect }) => {
    const text = renderUser(userMessage([ContentBlock.Text.make({ text: 'keep going', disposition: 'synthetic' })]));

    expect(text).toBe('<synthetic>keep going</synthetic>');
  });

  test('the summary view still hides synthetic turns', ({ expect }) => {
    const text = renderUser(
      userMessage([ContentBlock.Text.make({ text: 'keep going', disposition: 'synthetic' })]),
      'summary',
    );

    expect(text).toBe('');
  });
});

const message = (blocks: NonNullable<Parameters<typeof Message.make>[0]['blocks']>) =>
  Message.make({ created: new Date(0).toISOString(), sender: 'assistant', blocks });

/** The renderer's markdown, which is the only shape these cases produce. */
const markdown = (content: ItemContent): string => (content.kind === 'markdown' ? content.text : '');

const toolkitTags = (content: ItemContent) => markdown(content).match(/<toolkit/g)?.length ?? 0;

const userMessage = (blocks: ContentBlock.Any[]) =>
  Message.make({ created: new Date(0).toISOString(), sender: { role: 'user' }, blocks });

const renderUser = (message: Message.Message, viewType: Parameters<typeof createRenderer>[0] = 'normal'): string =>
  markdown(createRenderer(viewType)(message));
