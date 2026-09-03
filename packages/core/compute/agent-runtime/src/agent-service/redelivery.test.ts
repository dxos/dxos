//
// Copyright 2026 DXOS.org
//

import { describe, it } from 'vitest';

import * as Process from '@dxos/compute/Process';
import { type ContentBlock } from '@dxos/types';

import { type ToolResultEvent, dropReportedToolResults, toolResultPrompt, wakeUpPrompt } from './agent-process.ts';

// Recovering a tool result across a reload was, until now, exercised only when a race inside
// `AgentService.test.ts`'s `recovers queued tool results after reload` happened to land on it, and no
// recorded fixture captured the `<result pid=N>` shape at all. Both halves of the path are pure, so
// they are pinned here deterministically, with no model call.

const NOW = new Date('2026-06-04T12:00:00.000Z').getTime();

const toolResult = (pid: string, result: unknown = 'x', isError = false): ToolResultEvent => ({
  _tag: 'tool_result',
  pid: Process.ID.make(pid),
  result,
  isError,
});

/** Narrows to the text block so `text`/`disposition` are readable without a cast. */
const asText = (block: ContentBlock.Any) => {
  if (block._tag !== 'text') {
    throw new Error(`expected a text block, got ${block._tag}`);
  }
  return block;
};

describe('dropReportedToolResults', () => {
  it('drops a leading result whose value already reached the agent', ({ expect }) => {
    const queue = [toolResult('1'), toolResult('2')];
    const dropped = dropReportedToolResults(queue, (pid) => pid === Process.ID.make('1'));
    expect(dropped).toEqual([Process.ID.make('1')]);
    expect(queue.map((item) => item.pid)).toEqual([Process.ID.make('2')]);
  });

  it('keeps a result that was never reported, so recovery can redeliver it', ({ expect }) => {
    const queue = [toolResult('9')];
    expect(dropReportedToolResults(queue, () => false)).toEqual([]);
    expect(queue).toHaveLength(1);
  });

  // Only the head is stale after a reload; a reported result behind an unreported one belongs to a
  // turn that has not run yet, and dropping it would reorder delivery.
  it('stops at the first unreported result', ({ expect }) => {
    const queue = [toolResult('1'), toolResult('2'), toolResult('3')];
    const dropped = dropReportedToolResults(queue, (pid) => pid !== Process.ID.make('2'));
    expect(dropped).toEqual([Process.ID.make('1')]);
    expect(queue.map((item) => item.pid)).toEqual([Process.ID.make('2'), Process.ID.make('3')]);
  });
});

describe('toolResultPrompt', () => {
  it('redelivers a recovered tool result as a synthetic <result> block', ({ expect }) => {
    const [block] = toolResultPrompt(toolResult('9', 'listed on the NASDAQ'));
    // A text block rather than a tool-result part: the request the call belonged to is gone after the
    // reload, so its tool-call id can no longer be answered.
    expect(block._tag).toBe('text');
    expect(asText(block).text).toBe('<result pid=9>"listed on the NASDAQ"</result>');
    expect(asText(block).disposition).toBe('synthetic');
  });

  it('redelivers a failed tool result as a synthetic <error> block', ({ expect }) => {
    const [block] = toolResultPrompt(toolResult('9', 'boom', true));
    expect(asText(block).text).toBe('<error pid=9>boom</error>');
    expect(asText(block).disposition).toBe('synthetic');
  });
});

describe('wakeUpPrompt', () => {
  it('surfaces the alarm reminder verbatim with the scheduled time', ({ expect }) => {
    const prompt = wakeUpPrompt(NOW, 'check the build');
    expect(prompt).toContain('check the build');
    expect(prompt).toContain(new Date(NOW).toISOString());
  });

  it('falls back to a generic continuation prompt without a reminder', ({ expect }) => {
    expect(wakeUpPrompt(NOW, null)).toContain('Continue with whatever you intended');
  });
});
