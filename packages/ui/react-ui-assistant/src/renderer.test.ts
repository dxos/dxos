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

  test('narration joins the run it precedes rather than opening a widget of its own', ({ expect }) => {
    const render = createRenderer(undefined);
    const rendered = render(
      message([
        { _tag: 'status', statusText: 'Reading the space' },
        { _tag: 'toolCall', toolCallId: '1', name: 'a', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '1', name: 'a', providerExecuted: false, result: 'ok' },
      ]),
    );
    expect(toolkitTags(rendered)).toBe(1);
    expect(markdown(rendered)).not.toContain('<status>');
  });

  // The turn the model spends only saying what it is doing: a status and its reasoning used to
  // render as a widget apiece, and the call that arrived next displaced them with a panel.
  test('narration with no call of its own is still one panel', ({ expect }) => {
    const render = createRenderer(undefined);
    const rendered = render(
      message([
        { _tag: 'status', statusText: 'Reading the space' },
        { _tag: 'reasoning', reasoningText: 'The document has to be read before it can be edited.' },
        { _tag: 'text', text: 'Here is what I found.' },
      ]),
    );
    expect(toolkitTags(rendered)).toBe(1);
    expect(markdown(rendered)).not.toContain('<status>');
    expect(markdown(rendered)).not.toContain('<reasoning>');
    expect(markdown(rendered)).toContain('Here is what I found.');
  });

  test('narration with nothing to say opens no panel', ({ expect }) => {
    const render = createRenderer(undefined);
    const rendered = render(
      message([
        { _tag: 'status', statusText: '  ' },
        { _tag: 'text', text: 'Done.' },
      ]),
    );
    expect(toolkitTags(rendered)).toBe(0);
    expect(markdown(rendered)).toBe('Done.');
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

  // `collapseToolRuns` keeps the first message's identity, and the previous turn's trailing `stats`
  // message starts the run — so an alarm turn's synthetic prompt lands on an assistant-role message.
  // Keyed on the role, it rendered as the model's own prose with the panel frame gone.
  test('a synthetic block keeps its panel on an assistant-role message', ({ expect }) => {
    const rendered = createRenderer('normal')(
      message([
        { _tag: 'stats' },
        ContentBlock.Text.make({ text: 'Your scheduled alarm fired.', disposition: 'synthetic' }),
        { _tag: 'toolCall', toolCallId: '1', name: 'a', input: '{}', providerExecuted: false },
        { _tag: 'toolResult', toolCallId: '1', name: 'a', providerExecuted: false, result: 'ok' },
      ]),
    );

    expect(markdown(rendered)).toContain('<synthetic>Your scheduled alarm fired.</synthetic>');
    expect(toolkitTags(rendered)).toBe(1);
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
