//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import { describe, test } from 'vitest';

import { Alarm, ConsumedAnnotation, InFlightAnnotation, QueuedAnnotation } from '@dxos/assistant';
import { Annotation, Feed, Obj } from '@dxos/echo';
import { getDelivery } from '@dxos/react-ui-assistant/types';
import { ContentBlock, Message } from '@dxos/types';

import { type OutboxEntry } from './outbox.ts';
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

  // The agent sends a turn's prompt to the thread before the feed has it; with no lineage of its own it
  // must continue from the rewind point, not chain onto the abandoned reply that sorts before it.
  test('a turn message the feed has not recorded yet follows the rewound head', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const asked = message('asked');
    const replied = message('replied');
    const revised = message('revised');

    const { messages } = projectThread({
      feedMessages: [first, answer, asked, replied],
      pendingMessages: [replied, revised],
      rewindFrom: asked.id,
    });
    expect(text(messages)).toEqual(['first', 'answer', 'revised']);
  });

  test('a recorded continuation ends the rewind before its pointer is cleared', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const asked = message('asked');
    const replied = message('replied');
    const revised = message('revised');
    Feed.setParent(revised, answer);

    const { messages } = projectThread({
      feedMessages: [first, answer, asked, replied, revised],
      rewindFrom: asked.id,
    });
    expect(text(messages)).toEqual(['first', 'answer', 'revised']);
  });

  // The rewound prompt may itself continue an earlier fork from the same head; that is not the
  // continuation of this rewind.
  test('a rewound turn that continues an earlier fork does not end its own rewind', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const asked = message('asked');
    const replied = message('replied');
    Feed.setParent(asked, answer);
    // Delivered twice before the feed records it, which must still render once.
    const revised = message('revised');

    const { messages } = projectThread({
      feedMessages: [first, answer, asked, replied],
      pendingMessages: [revised, revised],
      rewindFrom: asked.id,
    });
    expect(text(messages)).toEqual(['first', 'answer', 'revised']);
  });

  test('an empty feed projects nothing', ({ expect }) => {
    expect(projectThread({ feedMessages: [] }).messages).toEqual([]);
  });
});

describe('queue projection', () => {
  test('a waiting queue entry is a delivered row after the turns', ({ expect }) => {
    const asked = message('answered');
    const waiting = queued(message('waiting'));
    const { messages, delivery, queued: count, tail } = projectThread({ feedMessages: [waiting, asked] });

    expect(text(messages)).toEqual(['answered', 'waiting']);
    expect(delivery.get(waiting.id)).toEqual({ status: 'delivered', entryId: waiting.id });
    expect(statusOf(messages[1])).toBe('delivered');
    expect(count).toBe(1);
    expect(tail).toBe(1);
  });

  test('a consumed queue entry leaves the tail — the turn it drove is the thread entry', ({ expect }) => {
    const entry = consumed(queued(message('do the thing')));
    const turn = message('do the thing');
    const { messages, queued: count } = projectThread({ feedMessages: [entry, turn] });

    // Exactly once in the thread, and no longer waiting.
    expect(text(messages)).toEqual(['do the thing']);
    expect(statusOf(messages[0])).toBeUndefined();
    expect(count).toBe(0);
  });

  // Regression: the entry stayed in the queue until the ack, which lands only after the turn — so the
  // prompt was rendered in the queue and the thread at once for the whole turn.
  test('an entry the running turn took up leaves the tail as soon as the thread shows it', ({ expect }) => {
    const entry = inFlight(queued(message('do the thing')));
    const turn = message('do the thing');
    const { messages, queued: count } = projectThread({ feedMessages: [entry, turn] });
    expect(text(messages)).toEqual(['do the thing']);
    expect(count).toBe(0);
  });

  test('an in-flight entry does not take the rest of the queue with it', ({ expect }) => {
    const running = inFlight(queued(positioned(message('running'), 1)));
    const waiting = queued(positioned(message('waiting'), 2));
    const turn = positioned(message('running'), 3);
    const { messages } = projectThread({ feedMessages: [running, waiting, turn] });
    expect(text(messages)).toEqual(['running', 'waiting']);
  });

  test('waiting entries are ordered by append order', ({ expect }) => {
    const second = queued(positioned(message('second'), 2));
    const first = queued(positioned(message('first'), 1));
    expect(text(projectThread({ feedMessages: [second, first] }).messages)).toEqual(['first', 'second']);
  });

  // A rewind truncates the thread; the queue is work that has not run, so it is unaffected.
  test('a rewind does not discard queued input', ({ expect }) => {
    const first = message('first');
    const discarded = message('discarded');
    const waiting = queued(message('waiting'));
    const { messages } = projectThread({
      feedMessages: [first, discarded, waiting],
      rewindFrom: discarded.id,
    });

    expect(text(messages)).toEqual(['first', 'waiting']);
  });
});

describe('optimistic prompts', () => {
  test('a prompt shows as sent before anything reaches the feed', ({ expect }) => {
    const earlier = message('earlier');
    const prompt = outboxEntry('hello', [earlier]);
    const { messages, delivery, queued: count } = projectThread({ feedMessages: [earlier], outbox: [prompt] });

    expect(text(messages)).toEqual(['earlier', 'hello']);
    expect(messages[1].id).toBe(prompt.id);
    expect(statusOf(messages[1])).toBe('sent');
    expect(delivery.get(prompt.id)?.status).toBe('sent');
    expect(count).toBe(1);
  });

  // The row is keyed by the outbox id at every step, which is what keeps it from remounting (or
  // showing twice) as the queue entry and then the turn's own message land.
  test('reconciles in place: sent, then delivered, then read, one row with one identity', ({ expect }) => {
    const earlier = message('earlier');
    const prompt = outboxEntry('hello', [earlier]);

    const sent = projectThread({ feedMessages: [earlier], outbox: [prompt] });

    const entry = queued(message('hello'));
    const delivered = projectThread({ feedMessages: [earlier, entry], outbox: [prompt] });
    expect(text(delivered.messages)).toEqual(['earlier', 'hello']);
    expect(delivered.messages[1].id).toBe(prompt.id);
    expect(statusOf(delivered.messages[1])).toBe('delivered');
    expect(delivered.delivery.get(prompt.id)?.entryId).toBe(entry.id);

    inFlight(entry);
    const turn = message('hello');
    const read = projectThread({ feedMessages: [earlier, entry, turn], outbox: [prompt] });
    expect(text(read.messages)).toEqual(['earlier', 'hello']);
    expect(read.messages[1].id).toBe(prompt.id);
    expect(statusOf(read.messages[1])).toBe('read');
    expect(read.delivery.get(prompt.id)?.turnId).toBe(turn.id);
    expect(read.queued).toBe(0);

    // The same position throughout: the last row before anything the turn appends.
    const answer = message('hi there', 'assistant');
    const answered = projectThread({ feedMessages: [earlier, entry, turn, answer], outbox: [prompt] });
    expect(text(answered.messages)).toEqual(['earlier', 'hello', 'hi there']);
    expect(answered.messages[1].id).toBe(prompt.id);
    expect(sent.messages[1].id).toBe(answered.messages[1].id);
  });

  test('a row that has not changed status is the same object, so it does not re-render', ({ expect }) => {
    const prompt = outboxEntry('hello', []);
    const first = projectThread({ feedMessages: [], outbox: [prompt] });
    const second = projectThread({ feedMessages: [message('unrelated', 'assistant')], outbox: [prompt] });
    expect(second.messages[1]).toBe(first.messages[0]);
  });

  test('a queue entry that is read before its turn replicates stays at the tail as read', ({ expect }) => {
    const prompt = outboxEntry('hello', []);
    const entry = inFlight(queued(message('hello')));
    const { messages } = projectThread({ feedMessages: [entry], outbox: [prompt] });
    expect(text(messages)).toEqual(['hello']);
    expect(statusOf(messages[0])).toBe('read');
  });

  test('several queued prompts keep their submit order through every stage', ({ expect }) => {
    const first = outboxEntry('first', []);
    const second = outboxEntry('second', []);
    const third = outboxEntry('third', []);
    const outbox = [first, second, third];

    // Only the second has landed: rows stay in submit order, not landing order.
    const secondEntry = queued(positioned(message('second'), 1));
    const partial = projectThread({ feedMessages: [secondEntry], outbox });
    expect(text(partial.messages)).toEqual(['first', 'second', 'third']);
    expect(partial.messages.map(statusOf)).toEqual(['sent', 'delivered', 'sent']);

    // The first is taken up and answered while the others wait behind it.
    const firstEntry = inFlight(queued(positioned(message('first'), 0)));
    const thirdEntry = queued(positioned(message('third'), 2));
    const firstTurn = positioned(message('first'), 3);
    const answer = positioned(message('one', 'assistant'), 4);
    const running = projectThread({
      feedMessages: [secondEntry, thirdEntry, firstEntry, firstTurn, answer],
      outbox,
    });
    expect(text(running.messages)).toEqual(['first', 'one', 'second', 'third']);
    expect(running.messages.map((row) => row.id)).toEqual([first.id, answer.id, second.id, third.id]);
    expect(running.messages.map(statusOf)).toEqual(['read', undefined, 'delivered', 'delivered']);
    expect(running.queued).toBe(2);
    expect(running.tail).toBe(2);
  });

  test('identical prompts pair with their own copies, in order', ({ expect }) => {
    const first = outboxEntry('yes', []);
    const second = outboxEntry('yes', []);
    const entry = queued(positioned(message('yes'), 1));
    const { messages } = projectThread({ feedMessages: [entry], outbox: [first, second] });
    expect(messages.map((row) => row.id)).toEqual([first.id, second.id]);
    expect(messages.map(statusOf)).toEqual(['delivered', 'sent']);
  });

  test('an identical prompt from before the submit is not taken for this one', ({ expect }) => {
    const old = message('yes');
    const answer = message('ok', 'assistant');
    const prompt = outboxEntry('yes', [old, answer]);
    const { messages } = projectThread({ feedMessages: [old, answer], outbox: [prompt] });
    expect(text(messages)).toEqual(['yes', 'ok', 'yes']);
    expect(messages[0].id).toBe(old.id);
    expect(statusOf(messages[2])).toBe('sent');
  });

  test('the turn matches with the blocks the agent prepends to the prompt', ({ expect }) => {
    const prompt = outboxEntry('hello', []);
    const turn = Message.make({
      created: new Date(clock++).toISOString(),
      sender: 'user',
      blocks: [
        { _tag: 'text', text: 'Objects changed since the last turn.', disposition: 'synthetic' },
        { _tag: 'text', text: 'hello' },
      ],
    });
    const { messages, delivery } = projectThread({ feedMessages: [turn], outbox: [prompt] });
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe(prompt.id);
    expect(delivery.get(prompt.id)?.turnId).toBe(turn.id);
  });

  test('a failed prompt shows as failed until something of it lands', ({ expect }) => {
    const prompt: OutboxEntry = { ...outboxEntry('hello', []), state: 'failed', error: new Error('offline') };
    expect(projectThread({ feedMessages: [], outbox: [prompt] }).messages.map(statusOf)).toEqual(['failed']);
    // Not counted against the queue limit: it is not waiting on the agent.
    expect(projectThread({ feedMessages: [], outbox: [prompt] }).queued).toBe(0);
  });

  test('a prompt whose turn was rewound away leaves the thread with it', ({ expect }) => {
    const prompt = outboxEntry('hello', []);
    const entry = consumed(queued(message('hello')));
    const turn = message('hello');
    const answer = message('hi', 'assistant');
    const { messages } = projectThread({
      feedMessages: [entry, turn, answer],
      outbox: [prompt],
      rewindFrom: turn.id,
    });
    expect(messages).toEqual([]);
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

  // The status line the model emits between calls ("Creating the agent") arrives as its own message,
  // so leaving it out of the fold split one run into a panel, a bare status row, and a second panel.
  test('a status between calls does not split the run', ({ expect }) => {
    const collapsed = collapseToolRuns([
      message('prompt'),
      toolCall('tc-1'),
      toolResult('tc-1'),
      status(),
      toolCall('tc-2'),
      toolResult('tc-2'),
      message('answer', 'assistant'),
    ]);

    expect(collapsed).toHaveLength(3);
    expect(collapsed[1].blocks.map((block) => block._tag)).toEqual([
      'toolCall',
      'toolResult',
      'status',
      'toolCall',
      'toolResult',
    ]);
  });

  // An agent that asks before a call reveals the call, then the request card, then the result.
  test("a result held apart by a request card joins its call's panel", ({ expect }) => {
    const call = toolCall('tc-1');
    const card = request('tc-1');
    const collapsed = collapseToolRuns([
      message('prompt'),
      call,
      card,
      toolResult('tc-1'),
      message('answer', 'assistant'),
    ]);

    expect(collapsed).toHaveLength(4);
    expect(collapsed[1].id).toBe(call.id);
    expect(collapsed[1].blocks.map((block) => block._tag)).toEqual(['toolCall', 'toolResult']);
    expect(collapsed[2]).toBe(card);
    expect(text([collapsed[3]])).toEqual(['answer']);
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

  // The thread re-projects on every streamed block; a new object per pass re-renders every panel.
  test('re-folding the same run returns the same message', ({ expect }) => {
    const run = [toolCall('tc-1'), toolResult('tc-1'), toolCall('tc-2')];
    const first = collapseToolRuns([message('prompt'), ...run]);
    const second = collapseToolRuns([message('prompt'), ...run, message('answer', 'assistant')]);
    expect(second[1]).toBe(first[1]);
  });

  test('a run that grows is folded afresh', ({ expect }) => {
    const run = [toolCall('tc-1'), toolResult('tc-1')];
    const before = collapseToolRuns(run);
    const after = collapseToolRuns([...run, toolCall('tc-2')]);
    expect(after[0]).not.toBe(before[0]);
    expect(after[0].id).toBe(before[0].id);
    expect(after[0].blocks).toHaveLength(3);
  });
});

const toolCall = (toolCallId: string) =>
  Message.make({
    created: new Date(clock++).toISOString(),
    sender: 'assistant',
    blocks: [{ _tag: 'toolCall', toolCallId, name: 'search', input: '{}', providerExecuted: false }],
  });

const request = (toolCallId: string) =>
  Message.make({
    created: new Date(clock++).toISOString(),
    sender: 'assistant',
    blocks: [{ _tag: 'request', requestId: toolCallId, title: 'Run search', toolCallId, options: [] }],
  });

const status = () =>
  Message.make({
    created: new Date(clock++).toISOString(),
    sender: 'assistant',
    blocks: [{ _tag: 'status', statusText: 'Creating the agent' }],
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

const statusOf = (message: Message.Message) => getDelivery(message);

/** A prompt as `ChatModel.send` holds it, submitted while the feed held `known`. */
const outboxEntry = (text: string, known: readonly Message.Message[]): OutboxEntry => ({
  id: Obj.ID.random(),
  created: new Date(clock++).toISOString(),
  blocks: [ContentBlock.Text.make({ text })],
  known: new Set(known.map(({ id }) => id)),
  state: 'submitted',
});
