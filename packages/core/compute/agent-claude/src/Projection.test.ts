//
// Copyright 2026 DXOS.org
//

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, test } from 'vitest';

import { ContentBlock } from '@dxos/types';

import * as Projection from './Projection';

const SESSION_ID = 'session-1';

/**
 * Fixtures carry only the fields the projector reads; the SDK frame types declare dozens more that
 * are irrelevant here, so the narrowing happens once, at this boundary, rather than per fixture.
 */
const frame = (value: Record<string, unknown>): SDKMessage => value as SDKMessage;

const assistant = (content: unknown[], overrides: Record<string, unknown> = {}): SDKMessage =>
  frame({
    type: 'assistant',
    uuid: 'uuid-assistant',
    session_id: SESSION_ID,
    parent_tool_use_id: null,
    message: { content },
    ...overrides,
  });

const user = (content: unknown[] | string, overrides: Record<string, unknown> = {}): SDKMessage =>
  frame({
    type: 'user',
    uuid: 'uuid-user',
    session_id: SESSION_ID,
    parent_tool_use_id: null,
    message: { role: 'user', content },
    ...overrides,
  });

const result = (overrides: Record<string, unknown> = {}): SDKMessage =>
  frame({
    type: 'result',
    subtype: 'success',
    uuid: 'uuid-result',
    session_id: SESSION_ID,
    duration_ms: 1234,
    stop_reason: 'end_turn',
    modelUsage: { 'claude-opus-5': { outputTokens: 20 } },
    usage: { input_tokens: 100, output_tokens: 20 },
    permission_denials: [],
    ...overrides,
  });

const toolResultBlock = (message: ContentBlock.Any | undefined): ContentBlock.ToolResult => {
  expect(message?._tag).to.eq('toolResult');
  return message as ContentBlock.ToolResult;
};

const statsBlock = (message: ContentBlock.Any | undefined): ContentBlock.Stats => {
  expect(message?._tag).to.eq('stats');
  return message as ContentBlock.Stats;
};

describe('Projection', () => {
  test('projects text into an assistant message', () => {
    const message = new Projection.Projector().message(assistant([{ type: 'text', text: 'hello' }]));
    expect(message?.sender.role).to.eq('assistant');
    expect(message?.threadId).to.eq(SESSION_ID);
    expect(message?.blocks).to.deep.include({ _tag: 'text', text: 'hello' });
  });

  test('projects thinking into a reasoning block', () => {
    const message = new Projection.Projector().message(
      assistant([{ type: 'thinking', thinking: 'considering', signature: 'sig' }]),
    );
    expect(message?.blocks[0]).to.deep.eq({ _tag: 'reasoning', reasoningText: 'considering', signature: 'sig' });
  });

  test('carries the SDK tree pointers through to properties', () => {
    const message = new Projection.Projector().message(
      assistant([{ type: 'text', text: 'from a subagent' }], {
        parent_tool_use_id: 'toolu_parent',
        subagent_type: 'Explore',
      }),
    );
    expect(message?.properties).to.deep.include({
      sdkUuid: 'uuid-assistant',
      sdkSessionId: SESSION_ID,
      parentToolUseId: 'toolu_parent',
      subagentType: 'Explore',
    });
  });

  test('correlates a tool result with its preceding tool call', () => {
    const projector = new Projection.Projector();
    projector.message(assistant([{ type: 'tool_use', id: 'toolu_1', name: 'Read', input: { file_path: '/tmp/x' } }]));
    const message = projector.message(user([{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'contents' }]));

    expect(message?.sender.role).to.eq('tool');
    const block = toolResultBlock(message?.blocks[0]);
    expect(block.name).to.eq('Read');
    expect(block.result).to.eq('contents');
    expect(block.error).to.be.undefined;
  });

  test('falls back to a placeholder name when the tool call was never seen', () => {
    const message = new Projection.Projector().message(
      user([{ type: 'tool_result', tool_use_id: 'toolu_orphan', content: 'x' }]),
    );
    expect(toolResultBlock(message?.blocks[0]).name).to.eq(Projection.UNKNOWN_TOOL_NAME);
  });

  test('projects a denied tool call as an errored tool result', () => {
    const projector = new Projection.Projector();
    projector.message(assistant([{ type: 'tool_use', id: 'toolu_2', name: 'Bash', input: { command: 'rm -rf /' } }]));
    const message = projector.message(
      user([
        { type: 'tool_result', tool_use_id: 'toolu_2', content: 'Permission to use Bash was denied', is_error: true },
      ]),
    );

    const block = toolResultBlock(message?.blocks[0]);
    expect(block.name).to.eq('Bash');
    expect(block.error).to.eq('Permission to use Bash was denied');
    expect(block.result).to.be.undefined;
  });

  test('accumulates the authoritative denial record from result frames', () => {
    const projector = new Projection.Projector();
    projector.message(
      result({
        permission_denials: [{ tool_name: 'Bash', tool_use_id: 'toolu_2', tool_input: { command: 'rm -rf /' } }],
      }),
    );

    expect(projector.denials).to.have.length(1);
    expect(projector.denials[0].tool_name).to.eq('Bash');
  });

  test('projects the result frame into stats', () => {
    const message = new Projection.Projector().message(result());
    const block = statsBlock(message?.blocks[0]);
    expect(block.model).to.eq('claude-opus-5');
    expect(block.usage).to.deep.eq({ inputTokens: 100, outputTokens: 20, totalTokens: 120 });
    expect(block.duration).to.eq(1234);
    expect(block.finishReason).to.eq('stop');
  });

  test('reports the model that produced the turn, not the auxiliary one', () => {
    // Mirrors a real payload: the SDK titles the session on a small model, and the main model's raw
    // key carries a context suffix that canonicalModel strips.
    const message = new Projection.Projector().message(
      result({
        modelUsage: {
          'claude-haiku-4-5-20251001': { outputTokens: 39, canonicalModel: 'claude-haiku-4-5' },
          'claude-opus-5[1m]': { outputTokens: 240, canonicalModel: 'claude-opus-5' },
        },
      }),
    );
    expect(statsBlock(message?.blocks[0]).model).to.eq('claude-opus-5');
  });

  test('reports a failed result as an error finish', () => {
    const message = new Projection.Projector().message(result({ subtype: 'error_max_turns', stop_reason: null }));
    expect(statsBlock(message?.blocks[0]).finishReason).to.eq('error');
  });

  test('drops frames that carry no conversation content', () => {
    const projector = new Projection.Projector();
    expect(projector.message(frame({ type: 'system', subtype: 'init', session_id: SESSION_ID }))).to.be.undefined;
    expect(projector.message(assistant([]))).to.be.undefined;
  });
});
