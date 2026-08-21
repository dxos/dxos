//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import AddRelationHandler from './add-relation';
import { TestObject, TestRelation, makeTestLayer } from './testing';

const TestLayer = makeTestLayer(AddRelationHandler);

describe('SpaceOperation.AddRelation', () => {
  it.effect(
    'takes a live schema and live ends, as an in-process caller has them',
    Effect.fnUntraced(
      function* ({ expect }) {
        const source = yield* Database.add(Obj.make(TestObject, { name: 'source' }));
        const target = yield* Database.add(Obj.make(TestObject, { name: 'target' }));
        yield* Database.flush();

        yield* Operation.invoke(SpaceOperation.AddRelation, {
          schema: TestRelation,
          source,
          target,
          fields: { note: 'live' },
        });

        const relations = yield* Database.query(Query.select(Filter.type(TestRelation))).run;
        const relation = relations[0];
        expect(Relation.getSource(relation).id).toBe(source.id);
        expect(Relation.getTarget(relation).id).toBe(target.id);
        expect(relation.note).toBe('live');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'takes a typename and references, as a remote caller has them',
    Effect.fnUntraced(
      function* ({ expect }) {
        const source = yield* Database.add(Obj.make(TestObject, { name: 'ref source' }));
        const target = yield* Database.add(Obj.make(TestObject, { name: 'ref target' }));
        yield* Database.flush();

        yield* Operation.invoke(SpaceOperation.AddRelation, {
          typename: 'com.example.relation.testRelation',
          source: Ref.make(source),
          target: Ref.make(target),
          fields: { note: 'remote' },
        });

        const relations = yield* Database.query(Query.select(Filter.type(TestRelation))).run;
        const relation = relations.find((candidate) => Relation.getSource(candidate).id === source.id);
        expect(relation).toBeDefined();
        expect(relation?.note).toBe('remote');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
