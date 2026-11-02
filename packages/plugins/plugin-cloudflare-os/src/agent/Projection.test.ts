//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type { Protocol } from '#api';

import * as Projection from './Projection.ts';

const agent = { type: 'agent' as const, id: 'model', name: 'Model' };
const user = { type: 'user' as const, id: 'alice', name: 'Alice' };

type TextMessage = Extract<Protocol.ChatMessage, { type: 'message' }>;

const message = (props: Partial<TextMessage>): TextMessage => ({
  chatId: 0,
  sequence: 1,
  timestamp: new Date(0),
  author: agent,
  type: 'message',
  message: '',
  ...props,
});

describe('Projection', () => {
  test('request ids round-trip and reject foreign ids', ({ expect }) => {
    expect(Projection.decodeRequestId(Projection.encodeRequestId({ kind: 'merge', chatId: 3 }))).toEqual({
      kind: 'merge',
      chatId: 3,
    });
    expect(Projection.decodeRequestId(Projection.encodeRequestId({ kind: 'action', actionId: 12 }))).toEqual({
      kind: 'action',
      actionId: 12,
    });
    expect(Projection.decodeRequestId('acp:permission:1')).toBeUndefined();
  });

  test('an agent message becomes reasoning, a tool summary and its text, in that order', ({ expect }) => {
    const blocks = Projection.messageBlocks(
      message({
        message: 'Done.',
        reasoning: 'Thinking.',
        toolCalls: [
          { toolCallId: '1', toolName: 'createGadget', input: { title: 'Counter' } },
          { toolCallId: '2', toolName: 'writeFile', input: { filename: 'app.ts' }, error: 'conflict' },
        ],
      }),
    );
    expect(blocks).toEqual([
      { _tag: 'reasoning', reasoningText: 'Thinking.' },
      { _tag: 'text', text: '- `createGadget` "Counter"\n- `writeFile` app.ts (failed: conflict)' },
      { _tag: 'text', text: 'Done.' },
    ]);
  });

  test('user messages and change records produce no blocks', ({ expect }) => {
    expect(Projection.messageBlocks(message({ author: user, message: 'Hi' }))).toEqual([]);
    expect(
      Projection.messageBlocks({
        chatId: 0,
        sequence: 2,
        timestamp: new Date(0),
        author: agent,
        type: 'changes',
        createdGadgets: [0],
      }),
    ).toEqual([]);
  });

  test('a merge request names the gadgets it changes', ({ expect }) => {
    const request = Projection.mergeRequest(4, ['Counter']);
    expect(request.title).toBe('Accept changes to Counter?');
    expect(request.options.map(({ id }) => id)).toEqual(['accept', 'revert']);
    expect(Projection.decodeRequestId(request.requestId)).toEqual({ kind: 'merge', chatId: 4 });
  });

  test('an action request previews what the gatekeeper would do', ({ expect }) => {
    const request = Projection.actionRequest({
      id: 7,
      resourceTitle: 'dxos/dxos',
      createdAt: new Date(0),
      state: 'pending',
      type: 'action',
      description: { title: 'Open an issue', description: 'Title: Fix login' },
    });
    expect(request.title).toBe('Open an issue');
    expect(request.preview).toEqual({ label: 'dxos/dxos', text: 'Title: Fix login' });
  });
});
