//
// Copyright 2026 DXOS.org
//

import * as Array from 'effect/Array';
import { describe, test } from 'vitest';

import { Feed, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { byAppendOrder, projectThread } from './thread';

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
    const { messages: projected, forkPointSuperseded } = projectThread({ feedMessages: messages });
    expect(text(projected)).toEqual(['one', 'two', 'three']);
    expect(forkPointSuperseded).toBe(false);
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

  // The button records a fork point before any continuation exists, so the pointer is the only thing
  // expressing the fork — the thread has to read back to it immediately.
  test('a pending fork point reads as the head', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const later = message('later');

    const { messages, forkPointSuperseded } = projectThread({
      feedMessages: [first, answer, later],
      forkPoint: answer.id,
    });
    expect(text(messages)).toEqual(['first', 'answer']);
    expect(forkPointSuperseded).toBe(false);
  });

  test('a fork point is superseded once a message continues from it', ({ expect }) => {
    const first = message('first');
    const answer = message('answer');
    const abandoned = message('abandoned');
    const retry = message('retry');
    Feed.setParent(retry, answer);

    const { messages, forkPointSuperseded } = projectThread({
      feedMessages: [first, answer, abandoned, retry],
      forkPoint: answer.id,
    });

    // Lineage now expresses the fork, so the pointer must not pin the view behind the branch it made.
    expect(forkPointSuperseded).toBe(true);
    expect(text(messages)).toEqual(['first', 'answer', 'retry']);
  });

  test('a fork point naming an absent message projects nothing', ({ expect }) => {
    const { messages } = projectThread({ feedMessages: [message('one')], forkPoint: message('absent').id });
    expect(messages).toEqual([]);
  });

  test('an empty feed projects nothing', ({ expect }) => {
    const { messages, forkPointSuperseded } = projectThread({ feedMessages: [] });
    expect(messages).toEqual([]);
    expect(forkPointSuperseded).toBe(false);
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
