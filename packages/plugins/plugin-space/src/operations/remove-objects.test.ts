//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol/types';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { Annotation, Collection, Database, Filter, Obj, Query, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import RemoveObjectsHandler from './remove-objects.ts';
import { TestObject } from './testing.ts';

// A capability manager with no layout contributed, as on a headless host.
const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(RemoveObjectsHandler),
  types: [Collection.Collection, SpaceProperties, TestObject],
  extraServices: Layer.sync(Capability.Service, () => CapabilityManager.make({ registry: AtomRegistry.make() })),
  disableLlmMemoization: true,
});

const loadRootCollection = Effect.fnUntraced(function* () {
  const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
  const ref = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrThrow);
  return yield* Database.load(ref);
});

describe('SpaceOperation.RemoveObjects', () => {
  // A remote host holds a bare database: no client `Space`, and refs decoded from URIs, not live handles.
  it.effect(
    'removes objects named by refs on a host without a client space, unlinking them from the root collection',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        const rootCollection = yield* loadRootCollection();
        const kept = yield* Database.add(Obj.make(TestObject, { name: 'kept' }));
        const removed = yield* Database.add(Obj.make(TestObject, { name: 'removed' }));
        Obj.update(rootCollection, (rootCollection) => {
          rootCollection.objects.push(Ref.make(kept), Ref.make(removed));
        });
        yield* Database.flush();

        const { indices } = yield* Operation.invoke(
          SpaceOperation.RemoveObjects,
          { refs: [db.makeRef<TestObject>(Obj.getURI(removed))] },
          { spaceId: db.spaceId },
        );

        expect(indices).toEqual([1]);
        expect(rootCollection.objects.map((ref) => ref.uri)).toEqual([Ref.make(kept).uri]);
        const remaining = yield* Database.query(Query.select(Filter.type(TestObject))).run;
        expect(remaining.map((object) => object.id)).toEqual([kept.id]);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
