//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN, Feed, Ref } from '@dxos/echo';

import * as Reducer from './Reducer.ts';
import * as Trajectory from './Trajectory.ts';

const user: Trajectory.Sender = { role: 'user', name: 'alice' };
const assistant: Trajectory.Sender = { role: 'assistant' };
const system: Trajectory.Sender = { role: 'event', name: 'alarm' };
const model = DXN.make('com.anthropic.model.claude-sonnet-5.default');

const text = (value: string) => [{ _tag: 'text' as const, text: value }];

const event = (
  payload: Trajectory.Payload,
  sender: Trajectory.Sender = assistant,
  thread?: Trajectory.EventId,
): Trajectory.Event => Trajectory.make({ payload, sender, thread });

const message = (value: string, sender: Trajectory.Sender = assistant, thread?: Trajectory.EventId) =>
  event({ _tag: 'message', blocks: text(value) }, sender, thread);

const texts = (entries: readonly Reducer.PromptEntry[]) =>
  entries.flatMap((entry) => entry.blocks.map((block) => (block._tag === 'text' ? block.text : block._tag)));

describe('Reducer', () => {
  describe('session', () => {
    test('queue holds user messages until consumed or cancelled', ({ expect }) => {
      const first = message('one', user);
      const second = message('two', user);
      const reply = message('reply');
      const { state } = Reducer.run(Reducer.session, [
        first,
        second,
        reply,
        event({ _tag: 'promptConsume', message: first.id }),
      ]);
      expect(state.queue).to.deep.eq([second.id]);

      const cancelled = Reducer.run(Reducer.session, [event({ _tag: 'promptCancel', message: second.id })], {
        state,
        count: 4,
      });
      expect(cancelled.state.queue).to.deep.eq([]);
    });

    test('alarms, bindings, background tools, threads, turn and model', ({ expect }) => {
      const set = event({ _tag: 'alarmSet', wakeAt: 10, message: 'ping' });
      const fired = event({ _tag: 'alarmSet', wakeAt: 20 });
      const feed = Ref.make(Feed.make());
      const open = event({ _tag: 'threadOpen', mode: 'fresh' });
      const turn = event({ _tag: 'turnBegin', model });
      const { state } = Reducer.run(Reducer.session, [
        set,
        fired,
        event({ _tag: 'alarmFire', alarm: fired.id }),
        event({ _tag: 'contextBind', skills: [], objects: [feed, feed] }),
        event({ _tag: 'toolBackground', toolCallId: 't1', pid: 'p1' }),
        event({ _tag: 'toolBackground', toolCallId: 't2' }),
        event({
          _tag: 'toolDeliver',
          toolCallId: 't1',
          result: { _tag: 'toolResult', toolCallId: 't1', name: 'x', providerExecuted: false },
        }),
        open,
        event({ _tag: 'threadClose', thread: open.id, status: 'completed' }),
        turn,
      ]);
      expect(state.alarms).to.deep.eq([{ id: set.id, wakeAt: 10, message: 'ping' }]);
      expect(state.objects).to.have.length(1);
      expect(state.background).to.deep.eq([{ toolCallId: 't2', pid: undefined }]);
      expect(state.threads).to.deep.eq([{ id: open.id, mode: 'fresh', status: 'completed' }]);
      expect(state.turns).to.deep.eq([turn.id]);
      expect(state.model).to.eq(model);

      const ended = Reducer.run(
        Reducer.session,
        [
          event({ _tag: 'turnEnd', begin: turn.id, finishReason: 'stop' }),
          event({ _tag: 'contextUnbind', skills: [], objects: [feed] }),
        ],
        { state, count: 10 },
      );
      expect(ended.state.turns).to.deep.eq([]);
      expect(ended.state.objects).to.have.length(0);
    });
  });

  describe('thread', () => {
    test('renders every message with its queue status', ({ expect }) => {
      const first = message('one', user);
      const second = message('two', user);
      const { state } = Reducer.run(Reducer.thread, [
        first,
        second,
        event({ _tag: 'promptConsume', message: first.id }),
        event({ _tag: 'promptCancel', message: second.id }),
        message('reply'),
        event({ _tag: 'alarmSet', wakeAt: 1 }),
      ]);
      expect(state.items.map((item) => item.status)).to.deep.eq(['cancelled', 'consumed', 'sent']);
    });

    test('a consumed message moves to where the model sees it and joins the turn', ({ expect }) => {
      const typed = message('typed mid-turn', user);
      const turn = event({ _tag: 'turnBegin', model });
      const { state } = Reducer.run(Reducer.thread, [
        message('call'),
        typed,
        message('result'),
        turn,
        event({ _tag: 'promptConsume', message: typed.id }, assistant, turn.id),
      ]);
      expect(state.items.at(-1)?.thread).to.eq(turn.id);
      expect(
        state.items.map(
          (item) =>
            `${item.status}:${item.blocks.map((block) => (block._tag === 'text' ? block.text : block._tag)).join(' ')}`,
        ),
      ).to.deep.eq(['sent:call', 'sent:result', 'consumed:typed mid-turn']);
    });
  });

  describe('prompt', () => {
    test('a user message enters the prompt where it is consumed', ({ expect }) => {
      const prompt = message('question', user);
      const { state } = Reducer.run(Reducer.prompt, [
        message('earlier'),
        prompt,
        message('wake up', system),
        event({ _tag: 'promptConsume', message: prompt.id }),
      ]);
      expect(texts(state.entries)).to.deep.eq(['earlier', 'wake up', 'question']);
      expect(state.held).to.deep.eq({});
    });

    test('a raw merge splices the thread, a summary merge appends its summary', ({ expect }) => {
      const turn = event({ _tag: 'threadOpen', mode: 'fork' });
      const subagent = event({ _tag: 'threadOpen', mode: 'fresh' });
      const { state } = Reducer.run(Reducer.prompt, [
        turn,
        subagent,
        message('turn reply', assistant, turn.id),
        message('subagent work', assistant, subagent.id),
        message('meanwhile', system),
        event({ _tag: 'threadMerge', thread: turn.id, mode: 'raw' }),
        event({ _tag: 'threadMerge', thread: subagent.id, mode: 'summary', summary: text('subagent summary') }),
      ]);
      expect(texts(state.entries)).to.deep.eq(['meanwhile', 'turn reply', 'subagent summary']);
      expect(state.threads).to.deep.eq({});
    });

    test('a turn reaches the main prompt as one block at its turnEnd', ({ expect }) => {
      const question = message('question', user);
      const first = event({ _tag: 'turnBegin', model, from: { event: question.id } });
      const second = event({ _tag: 'turnBegin', model, from: { event: question.id } });
      const steps = [
        question,
        first,
        second,
        event({ _tag: 'promptConsume', message: question.id }, assistant, first.id),
        message('first: call', assistant, first.id),
        message('second: call', assistant, second.id),
        message('first: answer', assistant, first.id),
      ];
      const during = Reducer.run(Reducer.prompt, steps);
      expect(texts(during.state.entries)).to.deep.eq([]);
      expect(texts(Reducer.promptFor(during.state, first.id))).to.deep.eq(['question', 'first: call', 'first: answer']);
      expect(texts(Reducer.promptFor(during.state, second.id))).to.deep.eq(['second: call']);

      const { state } = Reducer.run(
        Reducer.prompt,
        [
          event({ _tag: 'turnEnd', begin: first.id, finishReason: 'stop' }),
          event({ _tag: 'turnEnd', begin: second.id, finishReason: 'stop' }),
        ],
        during,
      );
      expect(texts(state.entries)).to.deep.eq(['question', 'first: call', 'first: answer', 'second: call']);
      expect(state.threads).to.deep.eq({});
    });

    test('a turn inside a thread merges into that thread, not main', ({ expect }) => {
      const subagent = event({ _tag: 'threadOpen', mode: 'fresh' });
      const brief = message('brief', system, subagent.id);
      const turn = event(
        { _tag: 'turnBegin', model, from: { thread: subagent.id, event: brief.id } },
        assistant,
        subagent.id,
      );
      const { state } = Reducer.run(Reducer.prompt, [
        message('main'),
        subagent,
        brief,
        turn,
        message('work', assistant, turn.id),
        event({ _tag: 'turnEnd', begin: turn.id, finishReason: 'stop' }, assistant, subagent.id),
      ]);
      expect(texts(state.entries)).to.deep.eq(['main']);
      expect(texts(Reducer.promptFor(state, subagent.id))).to.deep.eq(['brief', 'work']);
    });

    test('compact replaces its range with the summary', ({ expect }) => {
      const first = message('one');
      const second = message('two');
      const { state } = Reducer.run(Reducer.prompt, [
        first,
        second,
        message('three'),
        event({ _tag: 'compact', from: first.id, to: second.id, summary: text('one and two') }),
      ]);
      expect(texts(state.entries)).to.deep.eq(['one and two', 'three']);
    });

    test('a compact starting at a queued message leaves the prompt unchanged', ({ expect }) => {
      const queued = message('queued', user);
      const reply = message('reply');
      const { state } = Reducer.run(Reducer.prompt, [
        message('earlier'),
        queued,
        reply,
        event({ _tag: 'compact', from: queued.id, to: reply.id, summary: text('summary') }),
      ]);
      expect(texts(state.entries)).to.deep.eq(['earlier', 'reply']);
    });

    test('a reversed compact range leaves the prompt unchanged', ({ expect }) => {
      const first = message('one');
      const second = message('two');
      const third = message('three');
      const { state } = Reducer.run(Reducer.prompt, [
        first,
        second,
        third,
        event({ _tag: 'compact', from: third.id, to: first.id, summary: text('reversed') }),
      ]);
      expect(texts(state.entries)).to.deep.eq(['one', 'two', 'three']);
    });
  });

  describe('properties', () => {
    // Deterministic PRNG so a failing sequence reproduces.
    const random = (seed: number) => () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31;
      return seed / 2 ** 31;
    };

    const sequence = (seed: number, length: number): Trajectory.Event[] => {
      const next = random(seed);
      const pick = <T>(items: readonly T[]): T | undefined => items[Math.floor(next() * items.length)];
      const events: Trajectory.Event[] = [];
      const users: Trajectory.EventId[] = [];
      const threads: Trajectory.EventId[] = [];
      const turns: Trajectory.EventId[] = [];
      for (let index = 0; index < length; index++) {
        const roll = next();
        const thread = next() < 0.3 ? pick(threads) : undefined;
        const queued = pick(users);
        const merged = pick(threads);
        const ending = pick(turns);
        const compactFrom = pick(events.slice(0, 2));
        const compactTo = pick(events);
        let created: Trajectory.Event;
        if (roll < 0.25) {
          created = message(`user ${index}`, user, thread);
          users.push(created.id);
        } else if (roll < 0.45) {
          created = message(`assistant ${index}`, assistant, thread);
        } else if (roll < 0.55) {
          created = message(`event ${index}`, system);
        } else if (roll < 0.65 && queued) {
          created = event({ _tag: 'promptConsume', message: queued }, assistant, thread);
        } else if (roll < 0.7 && queued) {
          created = event({ _tag: 'promptCancel', message: queued }, user);
        } else if (roll < 0.8) {
          created = event({ _tag: 'threadOpen', mode: next() < 0.5 ? 'fork' : 'fresh' });
          threads.push(created.id);
        } else if (roll < 0.9 && merged) {
          const mode = next() < 0.5 ? 'raw' : 'summary';
          created = event({ _tag: 'threadMerge', thread: merged, mode, summary: text(`summary ${index}`) });
        } else if (roll < 0.95 && compactFrom && compactTo) {
          created = event({
            _tag: 'compact',
            from: compactFrom.id,
            to: compactTo.id,
            summary: text(`compact ${index}`),
          });
        } else if (roll < 0.97) {
          const head = events.at(-1);
          created = event(
            { _tag: 'turnBegin', model, from: head ? { thread, event: head.id } : undefined },
            assistant,
            thread,
          );
          threads.push(created.id);
          turns.push(created.id);
        } else if (ending) {
          created = event({ _tag: 'turnEnd', begin: ending, finishReason: 'stop' }, assistant);
        } else {
          created = event({ _tag: 'alarmSet', wakeAt: index });
        }

        events.push(created);
      }

      return events;
    };

    test('the prompt only grows, except at compact', ({ expect }) => {
      for (let seed = 1; seed <= 50; seed++) {
        let state = Reducer.prompt.initial;
        for (const next of sequence(seed, 60)) {
          const after = Reducer.prompt.step(state, next);
          if (next.payload._tag !== 'compact') {
            expect(after.entries.slice(0, state.entries.length), `seed ${seed}`).to.deep.eq(state.entries);
          }
          state = after;
        }
      }
    });

    test('resuming from a checkpoint matches a full replay', ({ expect }) => {
      const check = <S>(reducer: Reducer.Reducer<S>, events: readonly Trajectory.Event[], seed: number) => {
        const full = Reducer.run(reducer, events);
        const resumed = Reducer.run(reducer, events.slice(25), Reducer.run(reducer, events.slice(0, 25)));
        expect(resumed, `seed ${seed}`).to.deep.eq(full);
      };

      for (let seed = 1; seed <= 20; seed++) {
        const events = sequence(seed, 60);
        check(Reducer.session, events, seed);
        check(Reducer.thread, events, seed);
        check(Reducer.prompt, events, seed);
      }
    });
  });
});
