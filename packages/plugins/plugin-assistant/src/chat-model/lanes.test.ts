//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { EntityId } from '@dxos/keys';
import { Message } from '@dxos/types';

import { arrangeLanes, laneHues } from './lanes.ts';

/** Message ids by the short names the cases use. */
const ids = new Map<string, string>();
const idOf = (name: string) => ids.get(name) ?? (ids.set(name, EntityId.random()), ids.get(name) ?? name);

const message = (name: string, role: 'user' | 'assistant', value: string) =>
  Message.make({ id: idOf(name), sender: { role }, blocks: [{ _tag: 'text', text: value }] });

const lane = (
  id: string,
  status: Reducer.LaneStatus,
  {
    overlapped = true,
    backgrounded = false,
    kind = id === 'a' ? 'turn' : 'light',
  }: { overlapped?: boolean; backgrounded?: boolean; kind?: Reducer.Lane['kind'] } = {},
): Reducer.Lane => ({
  id: Trajectory.ThreadId.make(id),
  kind,
  status,
  owner: { role: 'assistant' },
  created: '2026-10-21T00:00:00.000Z',
  ...(overlapped ? { overlapped } : {}),
  ...(backgrounded ? { backgrounded } : {}),
});

/** Each row's text; the pinned row of lanes working out of view as `pinned:<lanes>`. */
const texts = (messages: readonly Message.Message[]) =>
  messages.map((entry) => {
    const value = Message.extractText(entry);
    return value.startsWith('<lane>')
      ? `pinned:${[...value.matchAll(/"lane":\{"id":"(\w)"/g)].map((match) => match[1]).join('')}`
      : value;
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

  test('main keeps every row of its turns, with no gutter, even once a newer request sends one to the background', ({
    expect,
  }) => {
    const arranged = arrangeLanes({
      messages,
      tail: 1,
      lanes: [lane('a', 'running', { backgrounded: true }), lane('b', 'done'), lane('c', 'waiting')],
      laneOf,
    });
    expect(texts(arranged.messages)).to.deep.eq(['research', '17 x 23', 'computing', '391', 'translate', 'queued']);
    expect(arranged.lanes.has(idOf('a1'))).to.eq(false);
    expect(arranged.lanes.get(idOf('c1'))?.status).to.eq('waiting');
    expect(arranged.lanes.get(idOf('b1'))?.first).to.eq(idOf('b1'));
    // Each lane beside main wears its own colour.
    expect(arranged.lanes.get(idOf('b1'))?.hue).not.to.eq(arranged.lanes.get(idOf('c1'))?.hue);
  });

  test('a thread working out of view is one row pinned after the transcript, before the queued tail', ({ expect }) => {
    const arranged = arrangeLanes({
      messages,
      tail: 1,
      lanes: [
        lane('a', 'running'),
        lane('b', 'running', { backgrounded: true, kind: 'fresh' }),
        lane('c', 'waiting', { backgrounded: true, kind: 'fresh' }),
      ],
      laneOf,
    });
    expect(texts(arranged.messages)).to.deep.eq(['research', 'computing', 'pinned:bc', 'queued']);
    // A delegated lane is named as a thread of the chat.
    expect(Message.extractText(arranged.messages[2])).to.include('"owner":"thread"');
  });

  test('a finished thread leaves the pinned rows and shows its answer where it completed', ({ expect }) => {
    const arranged = arrangeLanes({
      messages: [...messages.slice(0, 4), message('b3', 'assistant', 'answer'), message('m2', 'assistant', 'later')],
      tail: 0,
      lanes: [lane('a', 'done'), lane('b', 'done', { backgrounded: true, kind: 'fresh' })],
      laneOf: new Map([...laneOf, [idOf('b3'), 'b'], [idOf('m2'), 'a']]),
    });
    expect(texts(arranged.messages)).to.deep.eq(['research', 'computing', 'answer', 'later']);
    // The answer carries the thread's header and colour.
    expect(arranged.lanes.get(idOf('b3'))?.first).to.eq(idOf('b3'));
  });

  test('turns on main take no colour, so a thread keeps its colour however many turns main runs', ({ expect }) => {
    const threads = [lane('x', 'running', { kind: 'fresh' }), lane('y', 'running', { kind: 'fresh' })];
    const hues = laneHues([lane('a', 'done'), ...threads]);
    expect(hues.has('a')).to.eq(false);
    expect(laneHues([lane('a', 'done'), lane('a2', 'done', { kind: 'turn' }), ...threads])).to.deep.eq(hues);
  });

  test('lanes of different agents are not backgrounded, so they interleave', ({ expect }) => {
    const arranged = arrangeLanes({ messages, tail: 1, lanes: [lane('a', 'running'), lane('b', 'running')], laneOf });
    expect(texts(arranged.messages)).to.deep.eq(['research', '17 x 23', 'computing', '391', 'translate', 'queued']);
  });
});
