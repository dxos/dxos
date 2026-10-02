//
// Copyright 2026 DXOS.org
//

import type * as acp from '@agentclientprotocol/sdk';
import { describe, test } from 'vitest';

import { type Message } from '@dxos/types';

import * as Projection from './Projection.ts';

const text = (messageId: string, value: string): acp.SessionUpdate => ({
  sessionUpdate: 'agent_message_chunk',
  messageId,
  content: { type: 'text', text: value },
});

const blocks = (messages: Message.Message[]) => messages.map((message) => [message.sender.role, ...message.blocks]);

describe('TurnProjection', () => {
  test('joins the chunks of one message and flushes it when the next begins', ({ expect }) => {
    const projection = new Projection.TurnProjection();
    expect(projection.apply(text('m1', 'Hello'))).toEqual([]);
    expect(projection.apply(text('m1', ', world'))).toEqual([]);

    const flushed = projection.apply(text('m2', 'Next'));
    expect(blocks(flushed)).toEqual([['assistant', { _tag: 'text', text: 'Hello, world' }]]);
    expect(flushed[0].properties?.[Projection.ACP_MESSAGE_ID]).toBe('m1');

    const finished = projection.finish({ stopReason: 'end_turn', durationMs: 12 });
    expect(blocks(finished)).toEqual([
      ['assistant', { _tag: 'text', text: 'Next' }],
      ['assistant', { _tag: 'stats', duration: 12, finishReason: 'stop', model: undefined, usage: undefined }],
    ]);
  });

  test('keeps thoughts apart from the reply', ({ expect }) => {
    const projection = new Projection.TurnProjection();
    projection.apply({ sessionUpdate: 'agent_thought_chunk', content: { type: 'text', text: 'Thinking' } });
    const flushed = projection.apply(text('m1', 'Answer'));
    expect(blocks(flushed)).toEqual([['assistant', { _tag: 'reasoning', reasoningText: 'Thinking' }]]);
  });

  test('shows a tool call once its title settles, then its result', ({ expect }) => {
    const projection = new Projection.TurnProjection();
    expect(
      projection.apply({
        sessionUpdate: 'tool_call',
        toolCallId: 't1',
        title: 'Preparing file…',
        name: 'Write',
        status: 'pending',
        rawInput: { path: 'note.txt' },
      }),
    ).toEqual([]);
    expect(projection.apply({ sessionUpdate: 'tool_call_update', toolCallId: 't1', title: 'Write note.txt' })).toEqual(
      [],
    );

    const done = projection.apply({
      sessionUpdate: 'tool_call_update',
      toolCallId: 't1',
      status: 'completed',
      content: [{ type: 'diff', path: '/repo/note.txt', newText: 'hello\n' }],
    });
    expect(blocks(done)).toEqual([
      [
        'assistant',
        {
          _tag: 'toolCall',
          toolCallId: 't1',
          name: 'Write',
          operationName: 'Write note.txt',
          input: '{"path":"note.txt"}',
          providerExecuted: false,
        },
      ],
      [
        'tool',
        {
          _tag: 'toolResult',
          toolCallId: 't1',
          name: 'Write',
          providerExecuted: false,
          result: 'Edited /repo/note.txt',
        },
      ],
    ]);
  });

  test('reveals the call a permission request is about, before the request', ({ expect }) => {
    const projection = new Projection.TurnProjection();
    projection.apply({
      sessionUpdate: 'tool_call',
      toolCallId: 't2',
      title: 'Run pnpm test',
      name: 'Bash',
      status: 'pending',
    });
    expect(blocks(projection.reveal('t2'))).toEqual([
      ['assistant', expect.objectContaining({ _tag: 'toolCall', toolCallId: 't2', operationName: 'Run pnpm test' })],
    ]);

    const failed = projection.apply({
      sessionUpdate: 'tool_call_update',
      toolCallId: 't2',
      status: 'failed',
      content: [{ type: 'content', content: { type: 'text', text: 'denied' } }],
    });
    expect(blocks(failed)).toEqual([
      ['tool', { _tag: 'toolResult', toolCallId: 't2', name: 'Bash', providerExecuted: false, error: 'denied' }],
    ]);
  });

  test('reports usage and a cancelled turn', ({ expect }) => {
    const [stats] = new Projection.TurnProjection().finish({
      stopReason: 'cancelled',
      durationMs: 5,
      model: 'claude-sonnet-5',
      usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 },
    });
    expect(stats.blocks).toEqual([
      {
        _tag: 'stats',
        duration: 5,
        finishReason: 'other',
        model: 'claude-sonnet-5',
        usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 },
      },
    ]);
  });
});
