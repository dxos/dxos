//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Feed, Obj, Ref } from '@dxos/echo';
import { type Actor } from '@dxos/types';

import * as Payload from './Payload.ts';
import * as Trajectory from './Trajectory.ts';

const user: Actor.Actor = { role: 'user', name: 'alice' };
const assistant: Actor.Actor = { role: 'assistant' };
const anchor = Obj.ID.random();

const payloads: Payload.Any[] = [
  { _tag: 'message', role: 'user', blocks: [{ _tag: 'text', text: 'hello' }] },
  {
    _tag: 'message',
    role: 'assistant',
    blocks: [{ _tag: 'toolCall', toolCallId: 't1', name: 'search', input: '{}', providerExecuted: false }],
  },
  { _tag: 'external', source: 'alarm', blocks: [{ _tag: 'text', text: 'wake up' }] },
  { _tag: 'turnBegin', model: 'claude', promptHash: 'abc' },
  { _tag: 'turnEnd', begin: anchor, finishReason: 'stop', usage: { inputTokens: 10, cacheReadTokens: 8 } },
  { _tag: 'promptEnqueue', blocks: [{ _tag: 'text', text: 'next' }] },
  { _tag: 'promptConsume', enqueue: anchor },
  { _tag: 'promptCancel', enqueue: anchor },
  { _tag: 'contextBind', skills: [], objects: [] },
  { _tag: 'contextUnbind', skills: [], objects: [] },
  { _tag: 'alarmSet', wakeAt: 1_000, message: 'check build' },
  { _tag: 'alarmCancel', alarm: anchor },
  { _tag: 'alarmFire', alarm: anchor },
  { _tag: 'toolBackground', toolCallId: 't1', pid: 'p1' },
  {
    _tag: 'toolDeliver',
    toolCallId: 't1',
    result: { _tag: 'toolResult', toolCallId: 't1', name: 'search', providerExecuted: false },
  },
  { _tag: 'hookBegin', hook: 'lint', kind: 'agentic', thread: anchor },
  { _tag: 'hookEnd', begin: anchor, blocks: [{ _tag: 'text', text: 'ok' }] },
  { _tag: 'compact', from: anchor, to: anchor, summary: 'earlier work' },
  { _tag: 'threadOpen', mode: 'fork', from: { event: anchor }, purpose: 'turn' },
  { _tag: 'threadMerge', thread: anchor, mode: 'summary', summary: 'subagent result' },
  { _tag: 'threadClose', thread: anchor, status: 'completed' },
  { _tag: 'modelChange', model: 'claude-next' },
  { _tag: 'custom', type: 'org.example.checkpoint', visible: false, data: { step: 3 } },
];

describe('Trajectory', () => {
  test('payload fixtures cover every tag', ({ expect }) => {
    const tags = new Set(payloads.map((payload) => payload._tag));
    expect(tags.size).to.eq(Payload.Any.members.length);
  });

  test('every payload round-trips through the schema', ({ expect }) => {
    for (const payload of payloads) {
      const encoded = Schema.encodeSync(Payload.Any)(payload);
      expect(Schema.decodeUnknownSync(Payload.Any)(encoded)).to.deep.eq(payload);
    }
  });

  test('rejects an unknown tag', ({ expect }) => {
    expect(() => Schema.decodeUnknownSync(Payload.Any)({ _tag: 'nope' })).to.throw();
  });

  test('make() creates an event object for every payload', ({ expect }) => {
    for (const payload of payloads) {
      const event = Trajectory.make({ payload, actor: assistant });
      expect(Obj.instanceOf(Trajectory.Event, event)).to.be.true;
      expect(event.payload._tag).to.eq(payload._tag);
      expect(event.thread).to.be.undefined;
    }
  });

  test('make() keeps thread linkage and timestamp', ({ expect }) => {
    const open = Trajectory.make({ payload: { _tag: 'threadOpen', mode: 'fresh' }, actor: assistant });
    const event = Trajectory.make({
      payload: { _tag: 'message', role: 'user', blocks: [{ _tag: 'text', text: 'hi' }] },
      actor: user,
      thread: open.id,
      prev: open.id,
      created: '2026-01-01T00:00:00.000Z',
    });
    expect(event.thread).to.eq(open.id);
    expect(event.prev).to.eq(open.id);
    expect(event.created).to.eq('2026-01-01T00:00:00.000Z');
  });

  test('is() narrows by payload tag', ({ expect }) => {
    const event = Trajectory.make({ payload: { _tag: 'alarmSet', wakeAt: 5 }, actor: assistant });
    expect(Trajectory.is(event, 'alarmSet')).to.be.true;
    expect(Trajectory.is(event, 'alarmFire')).to.be.false;
    if (Trajectory.is(event, 'alarmSet')) {
      expect(event.payload.wakeAt).to.eq(5);
    }
  });

  test('threadOpen can fork from another conversation', ({ expect }) => {
    const feed = Feed.make();
    const event = Trajectory.make({
      payload: { _tag: 'threadOpen', mode: 'fork', from: { feed: Ref.make(feed), event: anchor } },
      actor: user,
    });
    expect(Trajectory.is(event, 'threadOpen') && event.payload.from?.feed?.target).to.eq(feed);
  });
});
