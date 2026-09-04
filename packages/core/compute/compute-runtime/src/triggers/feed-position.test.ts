//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Feed, Obj } from '@dxos/echo';
import { FeedProtocol } from '@dxos/protocols';
import { Person } from '@dxos/types';

import { filterReadyFeedItems } from './feed-position';

describe('feed-position', () => {
  describe('filterReadyFeedItems', () => {
    const stamp = <T extends Obj.Any>(obj: T, position: string): T => {
      Obj.update(obj, (obj) => {
        Obj.getMeta(obj).keys.push({ source: FeedProtocol.KEY_QUEUE_POSITION, id: position });
      });
      return obj;
    };

    test('skips items without a position key, including in the middle of the list', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = Obj.make(Person.Person, { fullName: 'Bob' });
      const carol = stamp(Obj.make(Person.Person, { fullName: 'Carol' }), '2');

      const ready = filterReadyFeedItems([alice, bob, carol], undefined);
      expect(ready.map(({ item }) => item)).toEqual([alice, carol]);
      expect(ready.map(({ cursor }) => cursor)).toEqual(['0', '2']);
    });

    test('skips items at or below the cursor', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = stamp(Obj.make(Person.Person, { fullName: 'Bob' }), '1');
      const carol = stamp(Obj.make(Person.Person, { fullName: 'Carol' }), '2');

      const ready = filterReadyFeedItems([alice, bob, carol], Feed.Cursor.make('1'));
      expect(ready.map(({ cursor }) => cursor)).toEqual(['2']);
    });

    test('returns all stamped items when cursor is undefined or the start sentinel', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = stamp(Obj.make(Person.Person, { fullName: 'Bob' }), '1');

      expect(filterReadyFeedItems([alice, bob], undefined)).toHaveLength(2);
      expect(filterReadyFeedItems([alice, bob], Feed.START)).toHaveLength(2);
    });

    test('rejects all items when cursor is malformed', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = stamp(Obj.make(Person.Person, { fullName: 'Bob' }), '1');

      const ready = filterReadyFeedItems([alice, bob], Feed.Cursor.make('not-a-number'));
      expect(ready).toEqual([]);
    });

    test('skips items with malformed position strings', ({ expect }) => {
      const alice = stamp(Obj.make(Person.Person, { fullName: 'Alice' }), '0');
      const bob = stamp(Obj.make(Person.Person, { fullName: 'Bob' }), '2abc');
      const carol = stamp(Obj.make(Person.Person, { fullName: 'Carol' }), '3');

      const ready = filterReadyFeedItems([alice, bob, carol], Feed.Cursor.make('0'));
      expect(ready.map(({ cursor }) => cursor)).toEqual(['3']);
    });
  });
});
