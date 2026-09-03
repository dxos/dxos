//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import { describe, test } from 'vitest';

import { Alarm, ConsumedAnnotation, InFlightAnnotation, QueuedAnnotation } from '@dxos/assistant';
import { Annotation, Feed, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { byAppendOrder, collapseToolRuns, projectAlarms, projectThread, resolveRewind } from './thread.ts';

describe('byAppendOrder', () => {
  test('orders by feed position when it discriminates', ({ expect }) => {
    const a = positioned(message('a'), 2);
    const b = positioned(message('b'), 1);
    expect(sortText([a, b])).toEqual(['b', 'a']);
  });

  // Positions are assigned by the server: with no position authority every block reports `+Infinity`,
  // and a query returns an unordered set, so position alone leaves them arbitrary.
  test('falls back to created when positions are absent', ({ expect }) => {
    const first = message('first');
    const second = message('second');
    expect(sortText([second, first])).toEqual(['first', 'second']);
  });

  test('an unpositioned message sorts after a positioned one', ({ expect }) => {
    const acknowledged = positioned(message('acknowledged'), 7);
    const local = message('local');
    expect(sortText([local, acknowledged])).toEqual(['acknowledged', 'local']);
  });
});

describe('projectThread', () => {
  test('a feed with no lineage projects to itself', ({ expect }) => {
    const messages = [message('one'), message('two'), message('three')];
    expect(text(projectThread({ feedMessages: messages }).messages)).toEqual(['one', 'two', 'three']);
  });

  test('pending messages are appended and deduped against the feed', ({ expect }) => {
    const persisted = message('persisted');
    const pending = message('pending');
    const { messages } = projectThread({
      feedMessages: [persisted, pending],
      pendingMessages: [pending],
    });
    expect(text(messages)).toEqual(['persisted', 'pending']);
  });

  test('lineage hides the turns a fork abandoned', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const abandoned = message('abandoned');
    const retry = message('retry');
    Feed.setParent(retry, answer);

    const { messages } = projectThread({ feedMessages: [first, answer, abandoned, retry] });
    expect(text(messages)).toEqual(['first', 'answer', 'retry']);
  });

  // Edit-and-resend: rewinding to a prompt discards the prompt and everything after it, so the user can
  // revise the question rather than stare at it unanswered.
  test('a pending rewind truncates to what precedes it', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const asked = message('asked');
    const replied = message('replied');

    const { messages } = projectThread({
      feedMessages: [first, answer, asked, replied],
      rewindFrom: asked.id,
    });
    expect(text(messages)).toEqual(['first', 'answer']);
  });

  test('rewinding to the first turn empties the thread', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const { messages } = projectThread({ feedMessages: [first, answer], rewindFrom: first.id });
    expect(messages).toEqual([]);
  });

  test('a stale rewind pointer falls back to the feed lineage', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const { messages } = projectThread({
      feedMessages: [first, answer],
      rewindFrom: message('never replicated').id,
    });
    expect(text(messages)).toEqual(['first', 'answer']);
  });

  test('an empty feed projects nothing', ({ expect }) => {
    expect(projectThread({ feedMessages: [] }).messages).toEqual([]);
  });
});

describe('queue projection', () => {
  test('a queued message is held out of the thread and listed as queued', ({ expect }) => {
    const asked = message('answered');
    const waiting = queued(message('waiting'));
    const { messages, queued: pending } = projectThread({ feedMessages: [asked, waiting] });

    expect(text(messages)).toEqual(['answered']);
    expect(text(pending)).toEqual(['waiting']);
  });

  test('a consumed queue entry leaves the queue — the turn it drove is the thread entry', ({ expect }) => {
    const entry = consumed(queued(message('do the thing')));
    const turn = message('do the thing');
    const { messages, queued: pending } = projectThread({ feedMessages: [entry, turn] });

    // Exactly once in the thread, and no longer waiting.
    expect(text(messages)).toEqual(['do the thing']);
    expect(pending).toEqual([]);
  });

  // Regression: the entry stayed in the queue until the ack, which lands only after the turn — so the
  // prompt was rendered in the queue and the thread at once for the whole turn.
  test('an entry the running turn took up leaves the queue as soon as the thread shows it', ({ expect }) => {
    const entry = inFlight(queued(message('do the thing')));
    const turn = message('do the thing');
    const { messages, queued: pending } = projectThread({ feedMessages: [entry, turn] });
    expect(text(messages)).toEqual(['do the thing']);
    expect(pending).toEqual([]);
  });

  test('an in-flight entry does not take the rest of the queue with it', ({ expect }) => {
    const running = inFlight(queued(positioned(message('running'), 1)));
    const waiting = queued(positioned(message('waiting'), 2));
    const turn = positioned(message('running'), 3);
    const { queued: pending } = projectThread({ feedMessages: [running, waiting, turn] });
    expect(text(pending)).toEqual(['waiting']);
  });

  test('queued messages are ordered by append order', ({ expect }) => {
    const second = queued(positioned(message('second'), 2));
    const first = queued(positioned(message('first'), 1));
    expect(text(projectThread({ feedMessages: [second, first] }).queued)).toEqual(['first', 'second']);
  });

  // A rewind truncates the thread; the queue is work that has not run, so it is unaffected.
  test('a rewind does not discard queued input', ({ expect }) => {
    const first = message('first');
    const discarded = message('discarded');
    const waiting = queued(message('waiting'));
    const { messages, queued: pending } = projectThread({
      feedMessages: [first, discarded, waiting],
      rewindFrom: discarded.id,
    });

    expect(text(messages)).toEqual(['first']);
    expect(text(pending)).toEqual(['waiting']);
  });
});

describe('projectAlarms', () => {
  test('pending alarms are ordered by wake time', ({ expect }) => {
    const later = Alarm.make({ wakeAt: 2_000 });
    const sooner = Alarm.make({ wakeAt: 1_000 });
    const alarms = projectAlarms({ feedAlarms: [later, sooner] });
    expect(alarms.map((alarm) => alarm.wakeAt)).toEqual([1_000, 2_000]);
  });

  test('an alarm the agent has consumed is no longer pending', ({ expect }) => {
    const fired = consumed(Alarm.make({ wakeAt: 1_000 }));
    const pending = Alarm.make({ wakeAt: 2_000 });
    const alarms = projectAlarms({ feedAlarms: [fired, pending] });
    expect(alarms.map((alarm) => alarm.id)).toEqual([pending.id]);
  });
});

describe('resolveRewind', () => {
  test('returns the discard point and the prompt text to restore', ({ expect }) => {
    const prompt = message('what is a feed?');
    const resolved = resolveRewind([message('earlier'), prompt], prompt.id);
    expect(resolved).toEqual({ rewindFrom: prompt.id, text: 'what is a feed?' });
  });

  test('an absent message resolves to nothing, so a stale click is a no-op', ({ expect }) => {
    expect(resolveRewind([message('only')], message('absent').id)).toBeUndefined();
  });
});

let clock = 0;

const message = (text: string, sender: 'user' | 'assistant' = 'user') =>
  Message.make({ created: new Date(clock++).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

describe('collapseToolRuns', () => {
  test('folds a run of tool-only messages into one, keeping the first message identity', ({ expect }) => {
    const prompt = message('prompt');
    const first = toolCall('tc-1');
    const answer = message('answer', 'assistant');
    const collapsed = collapseToolRuns([prompt, first, toolResult('tc-1'), toolCall('tc-2'), answer]);

    expect(text([collapsed[0]])).toEqual(['prompt']);
    expect(collapsed).toHaveLength(3);
    // The runtime delivers one block per message, so the fold is what gives the panel a run.
    expect(collapsed[1].blocks.map((block) => block._tag)).toEqual(['toolCall', 'toolResult', 'toolCall']);
    expect(collapsed[1].id).toBe(first.id);
    expect(text([collapsed[2]])).toEqual(['answer']);
  });

  test('a lone tool message is passed through unchanged', ({ expect }) => {
    const only = toolCall('tc-1');
    const collapsed = collapseToolRuns([message('prompt'), only]);
    expect(collapsed[1]).toBe(only);
  });

  test('a message carrying prose is never folded in', ({ expect }) => {
    const collapsed = collapseToolRuns([toolCall('tc-1'), message('interrupting', 'assistant'), toolCall('tc-2')]);
    expect(collapsed).toHaveLength(3);
  });

  // The model explains itself before each call, so a real run is call/reasoning/call — the shape
  // that produced one panel per call in the app.
  test('reasoning between calls does not split the run', ({ expect }) => {
    const collapsed = collapseToolRuns([
      message('prompt'),
      reasoning(),
      toolCall('tc-1'),
      toolResult('tc-1'),
      reasoning(),
      toolCall('tc-2'),
      toolResult('tc-2'),
      message('answer', 'assistant'),
    ]);

    expect(collapsed).toHaveLength(3);
    expect(collapsed[1].blocks.map((block) => block._tag)).toEqual([
      'reasoning',
      'toolCall',
      'toolResult',
      'reasoning',
      'toolCall',
      'toolResult',
    ]);
  });

  test('two runs separated by prose stay separate', ({ expect }) => {
    const collapsed = collapseToolRuns([
      toolCall('tc-1'),
      toolResult('tc-1'),
      message('between', 'assistant'),
      toolCall('tc-2'),
      toolResult('tc-2'),
    ]);
    expect(collapsed).toHaveLength(3);
    expect(collapsed[0].blocks).toHaveLength(2);
    expect(collapsed[2].blocks).toHaveLength(2);
  });
});

const toolCall = (toolCallId: string) =>
  Message.make({
    created: new Date(clock++).toISOString(),
    sender: 'assistant',
    blocks: [{ _tag: 'toolCall', toolCallId, name: 'search', input: '{}', providerExecuted: false }],
  });

const reasoning = () =>
  Message.make({
    created: new Date(clock++).toISOString(),
    sender: 'assistant',
    blocks: [{ _tag: 'reasoning', reasoningText: 'because' }],
  });

const toolResult = (toolCallId: string) =>
  Message.make({
    created: new Date(clock++).toISOString(),
    sender: 'user',
    blocks: [{ _tag: 'toolResult', toolCallId, name: 'search', result: 'ok', providerExecuted: false }],
  });

/** Stamps the queue position a position authority would have assigned. */
const positioned = (message: Message.Message, position: number) => {
  Obj.update(message, (message) => {
    Obj.getMeta(message).keys.push({ source: Feed.POSITION_KEY, id: String(position) });
  });
  return message;
};

const queued = (message: Message.Message) => {
  Obj.update(message, (message) => Annotation.set(message, QueuedAnnotation, true));
  return message;
};

const inFlight = <T extends Obj.Unknown>(item: T): T => {
  Obj.update(item, (item) => Annotation.set(item, InFlightAnnotation, true));
  return item;
};

const consumed = <T extends Obj.Unknown>(item: T): T => {
  Obj.update(item, (item) => Annotation.set(item, ConsumedAnnotation, true));
  return item;
};

const text = (messages: readonly Message.Message[]) =>
  messages.map((message) => (message.blocks[0] as { text: string }).text);

const sortText = (messages: Message.Message[]) => text(Array.sort(messages, byAppendOrder));
