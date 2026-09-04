//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Collection, Database, DXN, Feed, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import RemoveAllObjectsHandler from './remove-all-objects';

class TestObject extends Type.makeObject<TestObject>(DXN.make('com.example.type.testObject', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
) {}

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(RemoveAllObjectsHandler),
  types: [SpaceProperties, Collection.Collection, Skill.Skill, Feed.Feed, TestObject],
  disableLlmMemoization: true,
});

describe('RemoveAllObjects', () => {
  it.effect(
    'removes every object except the space properties and empties the root collection',
    Effect.fnUntraced(
      function* (_) {
        const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
        const rootCollectionRef = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(
          Option.getOrThrow,
        );
        const rootCollection = yield* Database.load(rootCollectionRef);

        const first = yield* Database.add(Obj.make(TestObject, { name: 'first' }));
        const second = yield* Database.add(Obj.make(TestObject, { name: 'second' }));
        Obj.update(rootCollection, (rootCollection) => {
          rootCollection.objects.push(Ref.make(first));
        });

        const { objectIds } = yield* Operation.invoke(SpaceOperation.RemoveAllObjects);
        expect([...objectIds].sort()).toEqual([first.id, second.id].sort());

        const remaining = yield* Database.query(Query.select(Filter.everything())).run;
        expect(remaining.map((object) => object.id).sort()).toEqual([properties.id, rootCollection.id].sort());
        expect(rootCollection.objects).toHaveLength(0);

        // Dropped, not soft-deleted: nothing is left behind to collect, and a `deleted:` query
        // finds no tombstone to recover from.
        const deleted = yield* Database.query(Query.select(Filter.everything()).options({ deleted: 'only' })).run;
        expect(deleted).toHaveLength(0);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
