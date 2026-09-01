//
// Copyright 2026 DXOS.org
//

import { describe, it } from 'vitest';

import * as Process from '@dxos/compute/Process';
import { ContentBlock } from '@dxos/types';

import { type AgentEvent, agentEventToPrompt, dropReportedToolResults } from './agent-process.ts';

// Recovering a tool result across a reload was, until now, exercised only when a race inside
// `AgentService.test.ts`'s `recovers queued tool results after reload` happened to land on it, and no
// recorded fixture captured the `<result pid=N>` shape at all. Both halves of the path are pure, so
// they are pinned here deterministically, with no model call.

const NOW = new Date('2026-06-04T12:00:00.000Z').getTime();

const toolResult = (pid: string, result: unknown = 'x', isError = false): AgentEvent => ({
  _tag: 'tool_result',
  pid: Process.ID.make(pid),
  result,
  isError,
});

const prompt = (text = 'hello'): AgentEvent => ({
  _tag: 'prompt',
  content: [ContentBlock.Text.make({ text })],
});

const alarm = (message: string | null): AgentEvent => ({ _tag: 'alarm', firedAt: NOW, message });

/** Narrows to the text block so `text`/`disposition` are readable without a cast. */
const asText = (block: ContentBlock.Any) => {
  if (block._tag !== 'text') {
    throw new Error(`expected a text block, got ${block._tag}`);
  }
  return block;
};

describe('dropReportedToolResults', () => {
  it('drops a leading result whose value already reached the agent', ({ expect }) => {
    const queue = [toolResult('1'), prompt()];
    const dropped = dropReportedToolResults(queue, (pid) => pid === Process.ID.make('1'));
    expect(dropped).toEqual([Process.ID.make('1')]);
    expect(queue.map((item) => item._tag)).toEqual(['prompt']);
  });

  it('keeps a result that was never reported, so recovery can redeliver it', ({ expect }) => {
    const queue = [toolResult('9')];
    expect(dropReportedToolResults(queue, () => false)).toEqual([]);
    expect(queue).toHaveLength(1);
  });

  // Only the head is stale after a reload; a result sitting behind a prompt belongs to a turn that has
  // not run yet, and dropping it would lose the value entirely.
  it('stops at the first item that is not a reported result', ({ expect }) => {
    const queue = [prompt(), toolResult('1')];
    expect(dropReportedToolResults(queue, () => true)).toEqual([]);
    expect(queue).toHaveLength(2);
  });
});

describe('agentEventToPrompt', () => {
  it('redelivers a recovered tool result as a synthetic <result> block', ({ expect }) => {
    const [block] = agentEventToPrompt(toolResult('9', 'listed on the NASDAQ'));
    // A text block rather than a tool-result part: the request the call belonged to is gone after the
    // reload, so its tool-call id can no longer be answered.
    expect(block._tag).toBe('text');
    expect(asText(block).text).toBe('<result pid=9>"listed on the NASDAQ"</result>');
    expect(asText(block).disposition).toBe('synthetic');
  });

  it('redelivers a failed tool result as a synthetic <error> block', ({ expect }) => {
    const [block] = agentEventToPrompt(toolResult('9', 'boom', true));
    expect(asText(block).text).toBe('<error pid=9>boom</error>');
    expect(asText(block).disposition).toBe('synthetic');
  });

  it('passes a queued prompt through unchanged', ({ expect }) => {
    const content = [ContentBlock.Text.make({ text: 'What is the capital of France?' })];
    expect(agentEventToPrompt({ _tag: 'prompt', content })).toEqual(content);
  });

  it('renders a fired self-wake as a synthetic block carrying the reminder', ({ expect }) => {
    const [block] = agentEventToPrompt(alarm('check the build'));
    expect(asText(block).disposition).toBe('synthetic');
    expect(asText(block).text).toContain('check the build');
  });
});
