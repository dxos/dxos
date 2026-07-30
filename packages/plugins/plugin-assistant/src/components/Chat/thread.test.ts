//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import { describe, test } from 'vitest';

import { Feed, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { byAppendOrder, projectThread, resolveRewind } from './thread';

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

/** Stamps the queue position a position authority would have assigned. */
const positioned = (message: Message.Message, position: number) => {
  Obj.update(message, (message) => {
    Obj.getMeta(message).keys.push({ source: Feed.POSITION_KEY, id: String(position) });
  });
  return message;
};

const text = (messages: readonly Message.Message[]) =>
  messages.map((message) => (message.blocks[0] as { text: string }).text);

const sortText = (messages: Message.Message[]) => text(Array.sort(messages, byAppendOrder));
