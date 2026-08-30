//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ItemContent } from '@dxos/react-ui-feed';
import { Message } from '@dxos/types';

import { createRenderer } from './renderer';

const message = (blocks: any[]) => Message.make({ created: new Date(0).toISOString(), sender: 'assistant', blocks });

/** The renderer's markdown, which is the only shape these cases produce. */
const markdown = (content: ItemContent): string => (content.kind === 'markdown' ? content.text : '');

const toolkitTags = (content: ItemContent) => markdown(content).match(/<toolkit/g)?.length ?? 0;

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
});
