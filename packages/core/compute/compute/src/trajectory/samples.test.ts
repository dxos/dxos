//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN, Obj } from '@dxos/echo';
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

/** An opener as `Feed.fork` writes it: the base of a branch of its own, which takes the opener's id here. */
const opener = (props: Omit<Trajectory.MakeProps, 'id' | 'thread'>): Trajectory.Event => {
  const id = Obj.ID.random();
  return Trajectory.make({ ...props, id, thread: Trajectory.ThreadId.make(id) });
};

/** The thread an opener started. */
const threadId = (event: Trajectory.Event): Trajectory.ThreadId => Trajectory.ThreadId.make(event.id);

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
    const turn = opener({
      payload: { _tag: 'turnBegin', model, from: { event: question.id } },
      sender: agent,
    });
    const followUp = Trajectory.make({ payload: { _tag: 'message', blocks: text('And in Bergen?') }, sender: alice });
    // Every event the turn produces carries `thread: turn.id`; #5 is typed by alice on the main thread meanwhile.
    const end = Trajectory.make({
      payload: { _tag: 'turnEnd', finishReason: 'stop', usage: { inputTokens: 900, cacheReadTokens: 0 } },
      sender: agent,
      thread: threadId(turn),
    });
    const events = [
      question,
      turn,
      Trajectory.make({
        payload: { _tag: 'promptConsume', message: question.id },
        sender: agent,
        thread: threadId(turn),
      }),
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
        thread: threadId(turn),
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
        thread: threadId(turn),
      }),
      Trajectory.make({
        payload: { _tag: 'message', blocks: text('Oslo is 12°C with rain.') },
        sender: agent,
        thread: threadId(turn),
      }),
    ];

    // While the turn runs, main is untouched and the turn sees main plus its own thread.
    const during = Reducer.run(Reducer.prompt, events);
    expect(lines(during.state.entries)).to.deep.eq([]);
    expect(lines(Reducer.promptFor(during.state, threadId(turn)))).to.deep.eq([
      'user: What is the weather in Oslo?',
      'assistant: toolCall',
      'tool: toolResult',
      'assistant: Oslo is 12°C with rain.',
    ]);

    const afterTurn = Reducer.run(Reducer.prompt, [end], during);
    expect(lines(afterTurn.state.entries)).to.deep.eq(lines(Reducer.promptFor(during.state, threadId(turn))));

    const session = Reducer.run(Reducer.session, [...events, end]).state;
    expect(session.queue).to.deep.eq([followUp.id]);
    expect(session.turns).to.deep.eq([]);

    // The next turn starts from what main showed after #8 and picks up the queued prompt; the earlier entries are
    // untouched, so the provider cache hits.
    const nextTurn = opener({
      payload: { _tag: 'turnBegin', model, from: { event: end.id } },
      sender: agent,
    });
    const next = Trajectory.make({
      payload: { _tag: 'promptConsume', message: followUp.id },
      sender: agent,
      thread: threadId(nextTurn),
    });
    const nextPrompt = Reducer.run(Reducer.prompt, [nextTurn, next], afterTurn);
    expect(lines(Reducer.promptFor(nextPrompt.state, threadId(nextTurn)))).to.deep.eq([
      ...lines(afterTurn.state.entries),
      'user: And in Bergen?',
    ]);

    const thread = Reducer.run(Reducer.thread, [...events, end, nextTurn, next]).state;
    expect(
      thread.items.map((item) => `${item.sender.role}:${item.status}:${item.thread === turn.id ? 1 : 2}`),
    ).to.deep.eq(['user:consumed:1', 'assistant:sent:1', 'tool:sent:1', 'assistant:sent:1', 'user:consumed:2']);
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
    const subagent = opener({
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
        thread: threadId(subagent),
      }),
      Trajectory.make({ payload: { _tag: 'alarmFire', alarm: set.id }, sender: alarm }),
      notice,
      Trajectory.make({
        payload: {
          _tag: 'threadMerge',
          mode: 'summary',
          summary: text('Both failures are a flaky echo test.'),
        },
        sender: agent,
        thread: threadId(subagent),
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

  test('3. two harnesses race for one prompt while a notice syncs in', ({ expect }) => {
    const laptop: Trajectory.Sender = { role: 'assistant', name: 'laptop' };
    const edge: Trajectory.Sender = { role: 'assistant', name: 'edge' };
    const question = Trajectory.make({
      payload: { _tag: 'message', blocks: text('Summarise the design doc.') },
      sender: alice,
    });
    // Both harnesses see #1 as their feed head and start a turn.
    const laptopTurn = opener({
      payload: { _tag: 'turnBegin', model, from: { event: question.id } },
      sender: laptop,
    });
    const edgeTurn = opener({
      payload: { _tag: 'turnBegin', model, from: { event: question.id } },
      sender: edge,
    });
    const won = Trajectory.make({
      payload: { _tag: 'promptConsume', message: question.id },
      sender: laptop,
      thread: threadId(laptopTurn),
    });
    const lost = Trajectory.make({
      payload: { _tag: 'promptConsume', message: question.id },
      sender: edge,
      thread: threadId(edgeTurn),
    });
    const notice = Trajectory.make({ payload: { _tag: 'message', blocks: text('CI is green.') }, sender: alarm });
    const events = [
      question,
      laptopTurn,
      edgeTurn,
      won,
      lost,
      // #5 folds after #4, so the edge harness lost the claim and ends its turn without calling the model.
      Trajectory.make({
        payload: { _tag: 'turnEnd', finishReason: 'other', error: 'prompt claimed by laptop' },
        sender: edge,
        thread: threadId(edgeTurn),
      }),
      notice,
      Trajectory.make({
        payload: { _tag: 'message', blocks: text('It replaces messages with one event log.') },
        sender: laptop,
        thread: threadId(laptopTurn),
      }),
      Trajectory.make({
        payload: { _tag: 'turnEnd', finishReason: 'stop' },
        sender: laptop,
        thread: threadId(laptopTurn),
      }),
    ];

    const session = Reducer.run(Reducer.session, events).state;
    expect(session.rejected).to.deep.eq([lost.id]);
    expect(session.turns).to.deep.eq([]);

    const prompt = Reducer.run(Reducer.prompt, events).state;
    expect(lines(prompt.entries)).to.deep.eq([
      'event: CI is green.',
      'user: Summarise the design doc.',
      'assistant: It replaces messages with one event log.',
    ]);
    // The laptop's turn ran without the notice that landed in main meanwhile; its merge is flagged, not undone.
    expect(prompt.stale).to.deep.eq({ [laptopTurn.id]: [notice.id] });

    const thread = Reducer.run(Reducer.thread, events).state;
    // The question shows once, where the laptop consumed it.
    expect(thread.items.map((item) => item.thread)).to.deep.eq([laptopTurn.id, undefined, laptopTurn.id]);
  });
});
