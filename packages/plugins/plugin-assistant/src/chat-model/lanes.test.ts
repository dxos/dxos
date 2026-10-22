//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EntityId } from '@dxos/keys';
import { type Reducer } from '@dxos/trajectory';
import { Message } from '@dxos/types';

import { arrangeLanes } from './lanes.ts';

/** Message ids by the short names the cases use. */
const ids = new Map<string, string>();
const idOf = (name: string) => ids.get(name) ?? (ids.set(name, EntityId.random()), ids.get(name) ?? name);

const message = (name: string, role: 'user' | 'assistant', value: string) =>
  Message.make({ id: idOf(name), sender: { role }, blocks: [{ _tag: 'text', text: value }] });

const lane = (
  id: string,
  status: Reducer.LaneStatus,
  { overlapped = true, backgrounded = false }: { overlapped?: boolean; backgrounded?: boolean } = {},
): Reducer.Lane => ({
  id,
  kind: id === 'a' ? 'turn' : 'light',
  status,
  owner: { role: 'assistant' },
  created: '2026-10-21T00:00:00.000Z',
  ...(overlapped ? { overlapped } : {}),
  ...(backgrounded ? { backgrounded } : {}),
});

/** Each row's text; a lane's card as `card:<lane>`. */
const texts = (messages: readonly Message.Message[]) =>
  messages.map((entry) => {
    const value = Message.extractText(entry);
    const card = /^<lane>.*?"id":"(\w)"/.exec(value);
    return card ? `card:${card[1]}` : value;
  });

describe('arrangeLanes', () => {
  // A runs on main; B and C were sent while it ran. Their events interleave in the feed.
  const messages = [
    message('a1', 'user', 'research'),
    message('b1', 'user', '17 x 23'),
    message('a2', 'assistant', 'computing'),
    message('b2', 'assistant', '391'),
    message('c1', 'user', 'translate'),
    message('q1', 'user', 'queued'),
  ];
  const laneOf = new Map([
    [idOf('a1'), 'a'],
    [idOf('a2'), 'a'],
    [idOf('b1'), 'b'],
    [idOf('b2'), 'b'],
    [idOf('c1'), 'c'],
  ]);

  test('a chat whose lanes never overlapped is left as it is', ({ expect }) => {
    const arranged = arrangeLanes({ messages, tail: 1, lanes: [lane('a', 'done', { overlapped: false })], laneOf });
    expect(arranged.messages).to.deep.eq(messages);
    expect(arranged.lanes.size).to.eq(0);
  });

  test('a lane sent to the background is one card in its original place; the queued tail stays last', ({ expect }) => {
    const arranged = arrangeLanes({
      messages,
      tail: 1,
      lanes: [lane('a', 'running', { backgrounded: true }), lane('b', 'done'), lane('c', 'waiting')],
      laneOf,
    });
    expect(texts(arranged.messages)).to.deep.eq(['card:a', '17 x 23', '391', 'translate', 'queued']);
    expect(arranged.lanes.get(idOf('c1'))?.status).to.eq('waiting');
    expect(arranged.lanes.get(idOf('b1'))?.first).to.eq(idOf('b1'));
    // Each lane wears its own colour.
    expect(arranged.lanes.get(idOf('b1'))?.hue).not.to.eq(arranged.lanes.get(idOf('c1'))?.hue);
    const card = arranged.messages[0].blocks[0];
    expect(card._tag === 'text' && card.text).to.include('computing');
  });

  test('a finished background lane keeps its card and shows its answer where it completed', ({ expect }) => {
    const arranged = arrangeLanes({
      messages: [...messages.slice(0, 5), message('a3', 'assistant', 'summary'), message('c2', 'assistant', 'résumé')],
      tail: 0,
      lanes: [lane('a', 'done', { backgrounded: true }), lane('b', 'done'), lane('c', 'done')],
      laneOf: new Map([...laneOf, [idOf('a3'), 'a'], [idOf('c2'), 'c']]),
    });
    expect(texts(arranged.messages)).to.deep.eq(['card:a', '17 x 23', '391', 'translate', 'summary', 'résumé']);
    // The answer carries the lane's header.
    expect(arranged.lanes.get(idOf('a3'))?.first).to.eq(idOf('a3'));
  });

  test('lanes of different agents are not backgrounded, so they interleave', ({ expect }) => {
    const arranged = arrangeLanes({ messages, tail: 1, lanes: [lane('a', 'running'), lane('b', 'running')], laneOf });
    expect(texts(arranged.messages)).to.deep.eq(['research', '17 x 23', 'computing', '391', 'translate', 'queued']);
  });
});
