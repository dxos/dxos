//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Reducer from './Reducer.ts';
import * as Trajectory from './Trajectory.ts';

const user: Trajectory.Sender = { role: 'user', name: 'alice' };
const assistant: Trajectory.Sender = { role: 'assistant', name: 'composer' };

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

/**
 * Turn A on main is mid tool call when prompt B arrives and opens light thread L, which runs a turn of its own.
 */
const parallel = () => {
  const promptA = message('Write a poem about the sea.', user);
  const turnA = event({ _tag: 'turnBegin', from: { event: promptA.id } });
  const consumeA = event({ _tag: 'promptConsume', message: promptA.id }, assistant, turnA.id);
  const callA = event(
    {
      _tag: 'message',
      blocks: [{ _tag: 'toolCall', toolCallId: 'c1', name: 'search', input: '{"q":"sea"}', providerExecuted: false }],
    },
    assistant,
    turnA.id,
  );
  const promptB = message('What is 17 times 23?', user);
  const light = event({
    _tag: 'threadOpen',
    mode: 'light',
    from: { event: promptB.id },
    purpose: 'What is 17 times 23?',
    siblings: [turnA.id],
  });
  const turnB = event({ _tag: 'turnBegin', from: { thread: light.id, event: light.id } });
  const consumeB = event({ _tag: 'promptConsume', message: promptB.id }, assistant, turnB.id);
  const answerB = message('391.', assistant, turnB.id);
  const endB = event({ _tag: 'turnEnd', begin: turnB.id, finishReason: 'stop' });
  const mergeB = event({ _tag: 'threadMerge', thread: light.id, mode: 'raw' });
  const resultA = event(
    {
      _tag: 'message',
      blocks: [{ _tag: 'toolResult', toolCallId: 'c1', name: 'search', result: 'waves', providerExecuted: false }],
    },
    { role: 'tool' },
    turnA.id,
  );
  const poemA = message('The sea is wide.', assistant, turnA.id);
  const endA = event({ _tag: 'turnEnd', begin: turnA.id, finishReason: 'stop' });
  return {
    promptA,
    turnA,
    light,
    turnB,
    head: [promptA, turnA, consumeA, callA, promptB, light, turnB, consumeB],
    tail: [answerB, endB, mergeB, resultA, poemA, endA],
  };
};

describe('light threads', () => {
  test('a light thread starts with main, a snapshot of its siblings, the separator and its prompt', ({ expect }) => {
    const { head, light, turnB, turnA } = parallel();
    const { state } = Reducer.run(Reducer.prompt, head);
    const prompt = Reducer.promptFor(state, turnB.id);
    expect(prompt.map((entry) => entry.role)).to.deep.eq(['event', 'user']);
    const [snapshot, request] = texts(prompt);
    expect(snapshot).to.include(`<thread id="${turnA.id}"`);
    expect(snapshot).to.include('alice: Write a poem about the sea.');
    expect(snapshot).to.include('[calls search({"q":"sea"})]');
    expect(snapshot).to.include(`You are thread ${light.id}.`);
    expect(snapshot).to.include('thread_wait');
    expect(request).to.eq('What is 17 times 23?');
    expect(prompt[0].ephemeral).to.eq(true);
  });

  test('the running turn does not see the light thread', ({ expect }) => {
    const { head, turnA } = parallel();
    const { state } = Reducer.run(Reducer.prompt, head);
    expect(texts(Reducer.promptFor(state, turnA.id))).to.deep.eq(['Write a poem about the sea.', 'toolCall']);
  });

  test('merging drops the snapshot and keeps the closure in merge order', ({ expect }) => {
    const { head, tail, turnA } = parallel();
    const { state } = Reducer.run(Reducer.prompt, [...head, ...tail]);
    expect(texts(state.entries)).to.deep.eq([
      'What is 17 times 23?',
      '391.',
      'Write a poem about the sea.',
      'toolCall',
      'toolResult',
      'The sea is wide.',
    ]);
    // Turn A merged after the light thread it never saw.
    expect(Object.keys(state.stale)).to.deep.eq([turnA.id]);
    expect(state.threads).to.deep.eq({});
  });

  test('a light thread without siblings is a plain fork', ({ expect }) => {
    const prompt = message('hello', user);
    const light = event({ _tag: 'threadOpen', mode: 'light', from: { event: prompt.id }, siblings: [] });
    const { state } = Reducer.run(Reducer.prompt, [prompt, light]);
    expect(Reducer.promptFor(state, light.id)).to.deep.eq([]);
  });

  test('a long sibling keeps its request and its latest entries', ({ expect }) => {
    const prompt = message('count', user);
    const turn = event({ _tag: 'turnBegin', from: { event: prompt.id } });
    const steps = Array.from({ length: 30 }, (_, index) => message(`step ${index}`, assistant, turn.id));
    const light = event({ _tag: 'threadOpen', mode: 'light', from: { event: steps[29].id }, siblings: [turn.id] });
    const { state } = Reducer.run(Reducer.prompt, [
      prompt,
      turn,
      event({ _tag: 'promptConsume', message: prompt.id }, assistant, turn.id),
      ...steps,
      light,
    ]);
    const [snapshot] = texts(Reducer.promptFor(state, light.id));
    expect(snapshot).to.include('alice: count');
    expect(snapshot).to.include('earlier entries left out');
    expect(snapshot).to.include('step 29');
    expect(snapshot).not.to.include('step 3\n');
  });

  test('the thread view groups items into lanes and marks overlap, waits and ends', ({ expect }) => {
    const { head, tail, turnA, light, turnB } = parallel();
    const wait = event({ _tag: 'threadWait', on: turnA.id }, assistant, turnB.id);
    const running = Reducer.run(Reducer.thread, [...head, wait]).state;
    expect(running.lanes.map(({ id, kind, status, overlapped }) => ({ id, kind, status, overlapped }))).to.deep.eq([
      { id: turnA.id, kind: 'turn', status: 'running', overlapped: true },
      { id: light.id, kind: 'light', status: 'waiting', overlapped: true },
    ]);
    expect(running.lanes[1].waitingOn).to.eq(turnA.id);
    expect(running.items.map((item) => item.lane)).to.deep.eq([turnA.id, turnA.id, light.id]);

    const done = Reducer.run(Reducer.thread, tail, Reducer.run(Reducer.thread, [...head, wait])).state;
    expect(done.lanes.map((lane) => lane.status)).to.deep.eq(['done', 'done']);
    expect(
      done.items
        .filter((item) => item.lane === light.id)
        .flatMap((item) => item.blocks.map((block) => (block._tag === 'text' ? block.text : block._tag))),
    ).to.deep.eq(['What is 17 times 23?', '391.']);
  });

  test('a turn that never overlapped is a lane without overlap', ({ expect }) => {
    const prompt = message('hi', user);
    const turn = event({ _tag: 'turnBegin', from: { event: prompt.id } });
    const { state } = Reducer.run(Reducer.thread, [
      prompt,
      turn,
      event({ _tag: 'promptConsume', message: prompt.id }, assistant, turn.id),
      message('hello', assistant, turn.id),
      event({ _tag: 'turnEnd', begin: turn.id, finishReason: 'stop' }),
    ]);
    expect(state.lanes).to.have.length(1);
    expect(state.lanes[0].overlapped).to.eq(undefined);
  });

  test('checkpoints round-trip through the codecs', ({ expect }) => {
    const { head } = parallel();
    const prompt = Reducer.run(Reducer.prompt, head).state;
    const thread = Reducer.run(Reducer.thread, head).state;
    const decodedPrompt = Schema.decodeUnknownSync(Reducer.prompt.schema)(
      Schema.encodeSync(Reducer.prompt.schema)(prompt),
    );
    const decodedThread = Schema.decodeUnknownSync(Reducer.thread.schema)(
      Schema.encodeSync(Reducer.thread.schema)(thread),
    );
    expect(texts(Reducer.promptFor(decodedPrompt, head[6].id))).to.deep.eq(
      texts(Reducer.promptFor(prompt, head[6].id)),
    );
    expect(decodedThread.lanes).to.deep.eq(thread.lanes);
  });
});
