//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { Event, Trigger } from '@dxos/async';
import { GraphQueryContext, Query, type Filter, type QuerySource } from '@dxos/echo-schema';
import * as R from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { describe, test } from '@dxos/test';

type IndexKind = { kind: 'typename' } | { kind: 'FIELD_MATCH'; field: string } | { kind: 'FULL_TEXT' };
type ObjectType = R.ReactiveObject<{ id: string } & Record<string, any>>;

interface Index<ObjectType extends { id: string }> {
  kind: IndexKind;
  updated: Event;
  addObject: (object: ObjectType) => void;
  removeObject: (object: ObjectType) => void;
  updateObject: (object: ObjectType) => void;

  find: (filter: Filter) => string[];
}

const createTypenameIndex = () => {
  const objects: ObjectType[] = [];
  const updated = new Event();

  const index: Index<ObjectType> = {
    kind: { kind: 'typename' },
    updated,
    addObject: (object) => {
      objects.push(object);
      updated.emit();
    },
    removeObject: (object) => {
      const index = objects.indexOf(object);
      if (index !== -1) {
        objects.splice(index, 1);
      }
      updated.emit();
    },
    updateObject: (object) => {
      const index = objects.indexOf(object);
      if (index !== -1) {
        objects[index] = object;
      }
      updated.emit();
    },
    find: (filter: Filter): string[] => {
      invariant(filter.type, 'Filter type is required.');
      // TODO(mykola): Add index (Orama?).
      return objects.filter((object) => R.getSchema(object) === filter.type).map((object) => object.id);
    },
  };

  return index;
};

// TODO(mykola): Lazy load objects.
const objects: ObjectType[] = [];

const createIndexQuerySource = (index: Index<ObjectType>): QuerySource => {
  const changed = new Event();
  index.updated.on(() => changed.emit());

  let savedFilter: Filter | undefined;
  return {
    getResults: (): any => {
      if (!savedFilter) {
        return [];
      }

      // TODO(mykola): Lazy load objects.
      return index.find(savedFilter).map((id) => ({ object: objects.find((object) => object.id === id) }));
    },
    changed,
    update: (filter: Filter) => {
      savedFilter = filter;
      changed.emit();
    },
  };
};

const createQuery = (indexes: Index<ObjectType>[], filter: Filter): Query => {
  const queryContext = new GraphQueryContext(async () => {
    indexes.forEach((index) => queryContext.addQuerySource(createIndexQuerySource(index)));
  });
  return new Query(queryContext, filter);
};

describe('indexing', () => {
  test('basic', async () => {
    const Contact = S.struct({
      name: S.string,
      age: S.optional(S.number),
      address: S.optional(
        S.struct({
          street: S.optional(S.string),
          city: S.string,
        }),
      ),
    }).pipe(R.echoObject('Contact', '0.1.0'));
    const typenameIndex = createTypenameIndex();
    // TODO(mykola): Fix Filter to accept Schema.
    const query = createQuery([typenameIndex], { type: Contact } as any as Filter);
    const done = new Trigger();

    query.subscribe((query) => {
      if (query.objects.length > 0) {
        expect(query.objects.length).to.equal(1);
        expect(query.objects[0].name).to.equal('Satoshi');
        done.wake();
      }
    }, true);

    type Contact = S.Schema.Type<typeof Contact>;

    const person: Contact = R.object(Contact, {
      name: 'Satoshi',
      age: 42,
      address: {
        street: '西麻布',
        city: 'Tokyo',
      },
    });
    objects.push(person);

    typenameIndex.addObject(person);
    await done.wait();
  });
});
