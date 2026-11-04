//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { describe, test, vi } from 'vitest';

import { Alarm, Legacy } from '@dxos/assistant';
import * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { type ViewBase, makeCachedTrajectoryView, makeTrajectoryView, selectThread } from './trajectory-view.ts';

const say = (text: string, role: Trajectory.Role = 'assistant', thread?: Trajectory.ThreadId) =>
  Trajectory.make({ payload: { _tag: 'message', blocks: [{ _tag: 'text', text }] }, sender: { role }, thread });

const texts = (messages: readonly Message.Message[]) => messages.map((message) => Message.extractText(message));

const setup = () => {
  const registry = AtomRegistry.make();
  const items = Atom.make<readonly Obj.Unknown[]>([]);
  const view = makeTrajectoryView(items);
  return {
    read: () => registry.get(view),
    set: (next: readonly Obj.Unknown[]) => registry.set(items, next),
  };
};

describe('makeTrajectoryView', () => {
  test('a prompt shows as queued until consumed, then where the turn took it up', ({ expect }) => {
    const { read, set } = setup();
    const question = say('question', 'user');
    const earlier = say('earlier');
    set([earlier, question]);

    const waiting = read().messages;
    expect(texts(waiting)).toEqual(['earlier', 'question']);
    expect(Legacy.isQueued(waiting[1])).toBe(true);

    const consume = Trajectory.make({
      payload: { _tag: 'promptConsume', message: question.id },
      sender: { role: 'assistant' },
    });
    set([earlier, question, say('meanwhile'), consume]);
    const consumed = read().messages;
    expect(texts(consumed)).toEqual(['earlier', 'meanwhile', 'question']);
    expect(Legacy.isQueued(consumed[2])).toBe(false);
    // Unchanged rows keep their identity across updates.
    expect(consumed[0]).toBe(waiting[0]);
  });

  test('a cancelled prompt leaves the thread', ({ expect }) => {
    const { read, set } = setup();
    const question = say('never mind', 'user');
    set([
      question,
      Trajectory.make({ payload: { _tag: 'promptCancel', message: question.id }, sender: { role: 'user' } }),
    ]);
    expect(read().messages).toEqual([]);
  });

  test('pending alarms sort by wake time, and fired ones count as self-wakes until a person prompts', ({ expect }) => {
    const { read, set } = setup();
    const later = Trajectory.make({ payload: { _tag: 'alarmSet', wakeAt: 2_000 }, sender: { role: 'event' } });
    const sooner = Trajectory.make({ payload: { _tag: 'alarmSet', wakeAt: 1_000 }, sender: { role: 'event' } });
    const fire = Trajectory.make({ payload: { _tag: 'alarmFire', alarm: sooner.id }, sender: { role: 'event' } });
    set([later, sooner, fire]);
    expect(read().alarms.map((alarm) => alarm.wakeAt)).toEqual([2_000]);
    expect(read().selfWakes).toBe(1);

    set([later, sooner, fire, say('back again', 'user')]);
    expect(read().selfWakes).toBe(0);
  });

  test('legacy records render alongside events', ({ expect }) => {
    const { read, set } = setup();
    const alarm = Alarm.make({ wakeAt: 5_000 });
    set([Message.make({ sender: 'user', blocks: [{ _tag: 'text', text: 'legacy' }] }), alarm, say('new')]);
    expect(texts(read().messages)).toEqual(['legacy', 'new']);
    expect(read().alarms.map((entry) => entry.id)).toEqual([alarm.id]);
  });
});

describe('makeCachedTrajectoryView', () => {
  test('starts from the loaded checkpoints and folds only the items after them', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const question = say('question', 'user');
    const fire = Trajectory.make({ payload: { _tag: 'alarmFire', alarm: question.id }, sender: { role: 'event' } });
    const folded = [question, say('answer'), fire];
    const base: ViewBase = {
      thread: Reducer.run(Reducer.thread, folded),
      session: Reducer.run(Reducer.session, folded),
    };
    const tail = Atom.make<readonly Obj.Unknown[]>([]);
    let followed = 0;
    const view = makeCachedTrajectoryView({
      load: async () => base,
      follow: () => {
        followed++;
        return tail;
      },
    });
    const unmount = registry.mount(view);

    expect(registry.get(view).messages).toEqual([]);
    await vi.waitFor(() => expect(texts(registry.get(view).messages)).toEqual(['question', 'answer']));
    expect(registry.get(view).selfWakes).toBe(1);

    registry.set(tail, [say('more')]);
    expect(texts(registry.get(view).messages)).toEqual(['question', 'answer', 'more']);
    registry.set(tail, [say('more'), say('again', 'user')]);
    expect(texts(registry.get(view).messages)).toEqual(['question', 'answer', 'more', 'again']);
    expect(registry.get(view).selfWakes).toBe(0);
    expect(followed).toBe(1);
    unmount();
  });
});

describe('selectThread', () => {
  test('main leaves out a fork, which shows main up to its fork point and then its own messages', ({ expect }) => {
    const { read, set } = setup();
    const colour = say('Name a colour.');
    const blue = say('Blue.');
    const id = Obj.ID.random();
    const fork = Trajectory.ThreadId.make(id);
    const open = Trajectory.make({
      id,
      payload: { _tag: 'threadOpen', mode: 'fork', from: { event: blue.id }, purpose: 'Shapes' },
      sender: { role: 'assistant' },
      thread: fork,
    });
    set([colour, blue, say('Name an animal.'), say('Cat.'), open, say('Square.', 'assistant', fork)]);

    const view = read();
    expect(view.forks.map((lane) => [lane.id, lane.from, lane.purpose])).toEqual([[fork, blue.id, 'Shapes']]);
    const main = selectThread(view);
    expect(texts(main.messages)).toEqual(['Name a colour.', 'Blue.', 'Name an animal.', 'Cat.']);
    expect(main.lanes.some((lane) => lane.kind === 'fork')).toBe(false);
    expect(texts(selectThread(view, fork).messages)).toEqual(['Name a colour.', 'Blue.', 'Square.']);
  });
});
