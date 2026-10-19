//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import {
  type TurnVerdict,
  causeGroup,
  formatReviewPrompt,
  isReportable,
  splitTurn,
  toStruggleEventProperties,
  toTrajectoryNdjson,
} from './turn-review.ts';

const text = (created: string, sender: 'user' | 'assistant', value: string) =>
  Message.make({ created, sender, blocks: [{ _tag: 'text', text: value }] });

const HISTORY = [
  text('2026-10-06T09:00:00.000Z', 'user', 'earlier question'),
  text('2026-10-06T09:00:05.000Z', 'assistant', 'earlier answer'),
  text('2026-10-06T10:00:00.000Z', 'user', 'latest question'),
  Message.make({
    created: '2026-10-06T10:00:02.000Z',
    sender: 'assistant',
    blocks: [
      { _tag: 'toolCall', toolCallId: '1', name: 'search', input: '{}', providerExecuted: false },
      { _tag: 'toolResult', toolCallId: '1', name: 'search', error: 'boom', providerExecuted: false },
    ],
  }),
];

const VERDICT: TurnVerdict = {
  struggled: true,
  cause: 'system_prompt_missing',
  severity: 'high',
  summary: 'The agent did not know how to find notes.',
  tools: [],
};

describe('turn review', () => {
  test('the turn starts at the last user message', ({ expect }) => {
    const { context, turn } = splitTurn(HISTORY);
    expect(context).toHaveLength(2);
    expect(turn).toHaveLength(2);
  });

  test('only prompting and tooling causes are reported', ({ expect }) => {
    expect(causeGroup('system_prompt_wrong')).toBe('system_prompt');
    expect(causeGroup('tool_missing')).toBe('tooling');
    expect(isReportable(VERDICT)).toBe(true);
    expect(isReportable({ ...VERDICT, cause: 'model' })).toBe(false);
    expect(isReportable({ ...VERDICT, struggled: false })).toBe(false);
  });

  test('the prompt marks the latest turn', ({ expect }) => {
    const [before, after] = formatReviewPrompt(HISTORY).split('<latest_turn>');
    expect(before).toContain('earlier question');
    expect(after).toContain('latest question');
    expect(after).toContain('[tool error search] boom');
  });

  test('trajectory and event carry the turn metadata', ({ expect }) => {
    const header = {
      sessionId: 'echo://space/feed',
      model: 'dxn:com.anthropic.model.claude-sonnet-5.default',
      codeMode: false,
      skills: ['Markdown', 'Tables'],
      verdict: VERDICT,
    };
    const lines = toTrajectoryNdjson(header, HISTORY)
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(lines).toHaveLength(1 + HISTORY.length);
    expect(lines[0]).toMatchObject({ type: 'header', skills: ['Markdown', 'Tables'] });

    expect(toStruggleEventProperties({ ...header, history: HISTORY, trajectoryKey: 'k' })).toMatchObject({
      $ai_session_id: 'echo://space/feed',
      model: 'dxn:com.anthropic.model.claude-sonnet-5.default',
      code_mode: false,
      skills: 'Markdown,Tables',
      cause_group: 'system_prompt',
      turn_message_count: 2,
      turn_tool_call_count: 1,
      turn_tool_error_count: 1,
      trajectory_key: 'k',
    });
  });
});
