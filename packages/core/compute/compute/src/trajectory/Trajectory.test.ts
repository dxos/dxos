//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Feed, Obj, Ref } from '@dxos/echo';
import { IdentityDid } from '@dxos/keys';

import * as Trajectory from './Trajectory.ts';

const user: Trajectory.Sender = { role: 'user', identity: IdentityDid.random(), name: 'alice' };
const assistant: Trajectory.Sender = { role: 'assistant' };
const model = DXN.make('com.anthropic.model.claude-sonnet-5.default');
const anchor = Obj.ID.random();
const branch = Trajectory.ThreadId.make('3@a');

const payloads: Trajectory.Payload[] = [
  { _tag: 'message', blocks: [{ _tag: 'text', text: 'hello' }] },
  {
    _tag: 'message',
    blocks: [{ _tag: 'toolCall', toolCallId: 't1', name: 'search', input: '{}', providerExecuted: false }],
  },
  { _tag: 'turnBegin', model },
  { _tag: 'turnEnd', finishReason: 'stop', usage: { inputTokens: 10, cacheReadTokens: 8 } },
  { _tag: 'promptConsume', message: anchor },
  { _tag: 'promptCancel', message: anchor },
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
  { _tag: 'hookBegin', hook: 'lint', kind: 'agentic', thread: branch },
  { _tag: 'hookEnd', begin: anchor, blocks: [{ _tag: 'text', text: 'ok' }] },
  { _tag: 'compact', from: anchor, to: anchor, summary: [{ _tag: 'text', text: 'earlier work' }] },
  { _tag: 'requestResolve', message: anchor, requestId: 'r1', resolution: { outcome: 'selected', optionId: 'allow' } },
  { _tag: 'rewind', from: anchor },
  { _tag: 'fork', from: { event: anchor } },
  { _tag: 'threadOpen', mode: 'fork', from: { event: anchor }, purpose: 'turn' },
  { _tag: 'threadMerge', mode: 'summary', summary: [{ _tag: 'text', text: 'subagent result' }] },
  { _tag: 'threadClose', status: 'completed' },
  { _tag: 'threadWait', on: branch },
  { _tag: 'modelChange', model },
  { _tag: 'custom', type: 'org.example.checkpoint', visible: false, data: { step: 3 } },
];

describe('Trajectory', () => {
  test('payload fixtures cover every tag', ({ expect }) => {
    const tags = new Set(payloads.map((payload) => payload._tag));
    expect(tags.size).to.eq(Trajectory.Payload.members.length);
  });

  test('every payload round-trips through the schema', ({ expect }) => {
    for (const payload of payloads) {
      const encoded = Schema.encodeSync(Trajectory.Payload)(payload);
      expect(Schema.decodeUnknownSync(Trajectory.Payload)(encoded)).to.deep.eq(payload);
    }
  });

  test('rejects an unknown tag', ({ expect }) => {
    expect(() => Schema.decodeUnknownSync(Trajectory.Payload)({ _tag: 'nope' })).to.throw();
  });

  test('make() creates an event object for every payload', ({ expect }) => {
    for (const payload of payloads) {
      const event = Trajectory.make({ payload, sender: assistant });
      expect(Obj.instanceOf(Trajectory.Event, event)).to.be.true;
      expect(event.payload._tag).to.eq(payload._tag);
      expect(Trajectory.threadOf(event)).to.be.undefined;
    }
  });

  test("make() puts the event on its thread's branch and keeps the timestamp", ({ expect }) => {
    const event = Trajectory.make({
      payload: { _tag: 'message', blocks: [{ _tag: 'text', text: 'hi' }] },
      sender: user,
      thread: branch,
      created: '2026-01-01T00:00:00.000Z',
    });
    expect(Trajectory.threadOf(event)).to.eq(branch);
    expect(Feed.getBranch(event)).to.eq(branch);
    expect(event.created).to.eq('2026-01-01T00:00:00.000Z');
  });

  test('sender identity must be a DID', ({ expect }) => {
    expect(Schema.decodeUnknownSync(Trajectory.Sender)(user)).to.deep.eq(user);
    expect(() => Schema.decodeUnknownSync(Trajectory.Sender)({ role: 'user', identity: 'alice' })).to.throw();
  });

  test('is() narrows by payload tag', ({ expect }) => {
    const event = Trajectory.make({ payload: { _tag: 'alarmSet', wakeAt: 5 }, sender: assistant });
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
      sender: user,
    });
    expect(Trajectory.is(event, 'threadOpen') && event.payload.from?.feed?.target).to.eq(feed);
  });
});
