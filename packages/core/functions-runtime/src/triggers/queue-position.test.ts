//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { FeedProtocol } from '@dxos/protocols';
import { Person } from '@dxos/types';

import { filterReadyQueueItems, getQueuePosition } from './queue-position';

describe('queue-position', () => {
  describe('getQueuePosition', () => {
    test('returns undefined when the key is absent', ({ expect }) => {
      const obj = Obj.make(Person.Person, { fullName: 'Alice' });
      expect(getQueuePosition(obj)).toBeUndefined();
    });

    test('returns the position id when the key is present', ({ expect }) => {
      const person = Obj.make(Person.Person, { fullName: 'Alice' });
      Obj.change(person, (person) => {
        Obj.getMeta(person).keys.push({ source: FeedProtocol.KEY_QUEUE_POSITION, id: '42' });
      });
      expect(getQueuePosition(person)).toBe('42');
    });
  });

  describe('filterReadyQueueItems', () => {
    const stamp = <T extends Obj.Any>(obj: T, position: string): T => {
      Obj.change(obj, (obj) => {
        Obj.getMeta(obj).keys.push({ source: FeedProtocol.KEY_QUEUE_POSITION, id: position });
      });
      return obj;
    };

    test('skips items without a position key, including in the middle of the list', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = Obj.make(Person.Person, { fullName: 'Bob' });
      const carol = stamp(Obj.make(Person.Person, { fullName: 'Carol' }), '2');

      const ready = filterReadyQueueItems([alice, bob, carol], undefined);
      expect(ready.map(({ item }) => item)).toEqual([alice, carol]);
      expect(ready.map(({ position }) => position)).toEqual(['0', '2']);
    });

    test('skips items at or below the cursor', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = stamp(Obj.make(Person.Person, { fullName: 'Bob' }), '1');
      const carol = stamp(Obj.make(Person.Person, { fullName: 'Carol' }), '2');

      const ready = filterReadyQueueItems([alice, bob, carol], '1');
      expect(ready.map(({ position }) => position)).toEqual(['2']);
    });

    test('returns all stamped items when cursor is undefined', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = stamp(Obj.make(Person.Person, { fullName: 'Bob' }), '1');

      const ready = filterReadyQueueItems([alice, bob], undefined);
      expect(ready).toHaveLength(2);
    });
  });
});
