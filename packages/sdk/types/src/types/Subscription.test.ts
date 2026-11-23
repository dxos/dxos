//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Option from 'effect/Option';

import { Annotation } from '@dxos/echo';

import * as Subscription from './Subscription.ts';
import * as Task from './Task.ts';

const ALICE = 'did:halo:alice';
const BOB = 'did:halo:bob';

describe('Subscription', () => {
  test('an object nobody subscribed to has no subscribers', ({ expect }) => {
    expect(Subscription.getSubscribers(Task.make({ title: 'Task' }), 'comments')).toEqual([]);
  });

  test('add creates the annotation, then adds further subscribers beside the first', ({ expect }) => {
    const task = Task.make({ title: 'Task' });
    Subscription.add(task, ALICE);
    Subscription.add(task, BOB);

    expect(Subscription.getSubscribers(task, 'comments')).toEqual([ALICE, BOB]);
  });

  test('an unsubscribe survives add', ({ expect }) => {
    const task = Task.make({ title: 'Task' });
    Subscription.add(task, ALICE);
    Subscription.set(task, ALICE, 'comments', false);
    Subscription.add(task, ALICE);

    expect(Subscription.getSubscribers(task, 'comments')).toEqual([]);
    const entry = Annotation.get(task, Subscription.Subscription).pipe(Option.map((subscribers) => subscribers[ALICE]));
    expect(Option.getOrUndefined(entry)?.kinds).toEqual({ comments: false });
  });

  test('set subscribes someone who never commented, and turns a kind back on', ({ expect }) => {
    const task = Task.make({ title: 'Task' });
    Subscription.set(task, BOB, 'comments', false);
    expect(Subscription.getSubscribers(task, 'comments')).toEqual([]);

    Subscription.set(task, BOB, 'comments', true);
    expect(Subscription.getSubscribers(task, 'comments')).toEqual([BOB]);
  });

  test('isSubscribed reads a missing entry as off and a missing kind as on', ({ expect }) => {
    expect(Subscription.isSubscribed(undefined, 'comments')).toBe(false);
    expect(Subscription.isSubscribed({ since: '2026-11-03T00:00:00.000Z' }, 'comments')).toBe(true);
  });
});
