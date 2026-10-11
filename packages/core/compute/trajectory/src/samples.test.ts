//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/echo';
import { type ContentBlock } from '@dxos/types';

import * as Reducer from './Reducer.ts';
import * as Trajectory from './Trajectory.ts';

// Keep in sync with README.md, which shows these sequences and the outputs asserted here.

const alice: Trajectory.Sender = { role: 'user', name: 'alice' };
const agent: Trajectory.Sender = { role: 'assistant' };
const tool: Trajectory.Sender = { role: 'tool' };
const alarm: Trajectory.Sender = { role: 'event', name: 'alarm' };
const model = DXN.make('com.anthropic.model.claude-sonnet-5.default');

const text = (value: string): ContentBlock.Any[] => [{ _tag: 'text', text: value }];

/** Renders prompt entries as `role: text` lines, the form README.md uses. */
const lines = (entries: readonly Reducer.PromptEntry[]) =>
  entries.map(
    (entry) =>
      `${entry.role}: ${entry.blocks.map((block) => (block._tag === 'text' ? block.text : block._tag)).join(' ')}`,
  );

describe('samples', () => {
  test('1. a chat turn with a tool call and a prompt typed mid-turn', ({ expect }) => {
    const question = Trajectory.make({
      payload: { _tag: 'message', blocks: text('What is the weather in Oslo?') },
      sender: alice,
    });
    const turn = Trajectory.make({ payload: { _tag: 'turnBegin', model }, sender: agent });
    const followUp = Trajectory.make({ payload: { _tag: 'message', blocks: text('And in Bergen?') }, sender: alice });
    const events = [
      question,
      Trajectory.make({ payload: { _tag: 'promptConsume', message: question.id }, sender: agent }),
      turn,
      Trajectory.make({
        payload: {
          _tag: 'message',
          blocks: [
            {
              _tag: 'toolCall',
              toolCallId: 'call-1',
              name: 'weather',
              input: '{"city":"Oslo"}',
              providerExecuted: false,
            },
          ],
        },
        sender: agent,
      }),
      followUp,
      Trajectory.make({
        payload: {
          _tag: 'message',
          blocks: [
            {
              _tag: 'toolResult',
              toolCallId: 'call-1',
              name: 'weather',
              result: '12°C, rain',
              providerExecuted: false,
            },
          ],
        },
        sender: tool,
      }),
      Trajectory.make({ payload: { _tag: 'message', blocks: text('Oslo is 12°C with rain.') }, sender: agent }),
      Trajectory.make({
        payload: {
          _tag: 'turnEnd',
          begin: turn.id,
          finishReason: 'stop',
          usage: { inputTokens: 900, cacheReadTokens: 0 },
        },
        sender: agent,
      }),
    ];

    const afterTurn = Reducer.run(Reducer.prompt, events);
    expect(lines(afterTurn.state.entries)).to.deep.eq([
      'user: What is the weather in Oslo?',
      'assistant: toolCall',
      'tool: toolResult',
      'assistant: Oslo is 12°C with rain.',
    ]);

    const session = Reducer.run(Reducer.session, events).state;
    expect(session.queue).to.deep.eq([followUp.id]);
    expect(session.turn).to.be.undefined;

    // The next turn picks up the queued prompt; the earlier entries are untouched, so the provider cache hits.
    const next = Trajectory.make({ payload: { _tag: 'promptConsume', message: followUp.id }, sender: agent });
    const nextPrompt = Reducer.run(Reducer.prompt, [next], afterTurn);
    expect(lines(nextPrompt.state.entries)).to.deep.eq([...lines(afterTurn.state.entries), 'user: And in Bergen?']);

    const thread = Reducer.run(Reducer.thread, [...events, next]).state;
    expect(thread.items.map((item) => `${item.sender.role}:${item.status}`)).to.deep.eq([
      'user:consumed',
      'assistant:sent',
      'user:consumed',
      'tool:sent',
      'assistant:sent',
    ]);
  });

  test('2. an alarm, a subagent thread and a compaction', ({ expect }) => {
    const request = Trajectory.make({
      payload: { _tag: 'message', blocks: text('Watch CI and tell me what fails.') },
      sender: alice,
    });
    const set = Trajectory.make({
      payload: { _tag: 'alarmSet', wakeAt: 1_800_000, message: 'check CI' },
      sender: agent,
    });
    const subagent = Trajectory.make({
      payload: { _tag: 'threadOpen', mode: 'fresh', purpose: 'triage failures' },
      sender: agent,
    });
    const notice = Trajectory.make({
      payload: { _tag: 'message', blocks: text('CI finished: 2 failures.') },
      sender: alarm,
    });
    const events = [
      request,
      Trajectory.make({ payload: { _tag: 'promptConsume', message: request.id }, sender: agent }),
      set,
      subagent,
      Trajectory.make({
        payload: { _tag: 'message', blocks: text('Reading the failing logs.') },
        sender: agent,
        thread: subagent.id,
      }),
      Trajectory.make({ payload: { _tag: 'alarmFire', alarm: set.id }, sender: alarm }),
      notice,
      Trajectory.make({
        payload: {
          _tag: 'threadMerge',
          thread: subagent.id,
          mode: 'summary',
          summary: text('Both failures are a flaky echo test.'),
        },
        sender: agent,
      }),
    ];

    const prompt = Reducer.run(Reducer.prompt, events);
    expect(lines(prompt.state.entries)).to.deep.eq([
      'user: Watch CI and tell me what fails.',
      'event: CI finished: 2 failures.',
      'event: Both failures are a flaky echo test.',
    ]);

    const session = Reducer.run(Reducer.session, events).state;
    expect(session.alarms).to.deep.eq([]);
    expect(session.threads).to.deep.eq([{ id: subagent.id, mode: 'fresh', status: 'merged' }]);

    const compacted = Reducer.run(
      Reducer.prompt,
      [
        Trajectory.make({
          payload: {
            _tag: 'compact',
            from: request.id,
            to: notice.id,
            summary: text('Alice asked to watch CI; it finished with 2 failures.'),
          },
          sender: agent,
        }),
      ],
      prompt,
    );
    expect(lines(compacted.state.entries)).to.deep.eq([
      'event: Alice asked to watch CI; it finished with 2 failures.',
      'event: Both failures are a flaky echo test.',
    ]);
  });
});
