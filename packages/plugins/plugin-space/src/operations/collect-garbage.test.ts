//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Collection, Database, DXN, Feed, Filter, Obj, Query, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import CollectGarbageHandler from './collect-garbage.ts';

class TestObject extends Type.makeObject<TestObject>(DXN.make('com.example.type.testObject', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
) {}

// The full `SpaceOperationHandlerSet` is not registrable here: the test layer serializes every
// definition and some (e.g. `ImportSpace`) carry non-JSON-serializable schemas.
const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(CollectGarbageHandler),
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Feed.Feed, TestObject],
  disableLlmMemoization: true,
});

describe('CollectGarbage', () => {
  it.effect(
    'reclaims soft-deleted objects and leaves the live ones alone',
    Effect.fnUntraced(
      function* (_) {
        const kept = yield* Database.add(Obj.make(TestObject, { name: 'kept' }));
        const removed = yield* Database.add(Obj.make(TestObject, { name: 'removed' }));
        yield* Database.flush();

        yield* Database.remove(removed);
        yield* Database.flush();

        const report = yield* Operation.invoke(SpaceOperation.CollectGarbage);
        expect(report.unlinkedObjects).toBeGreaterThanOrEqual(1);
        expect(report.removedDocuments).toBeGreaterThanOrEqual(1);

        const remaining = yield* Database.query(Query.select(Filter.type(TestObject))).run;
        expect(remaining.map((object) => object.id)).toEqual([kept.id]);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'reclaims nothing when there is nothing deleted',
    Effect.fnUntraced(
      function* (_) {
        yield* Database.add(Obj.make(TestObject, { name: 'live' }));
        yield* Database.flush();

        const report = yield* Operation.invoke(SpaceOperation.CollectGarbage);
        expect(report).toEqual({ unlinkedObjects: 0, removedDocuments: 0 });
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
