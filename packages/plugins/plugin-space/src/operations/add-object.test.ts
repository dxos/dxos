//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { WithProperties } from '@dxos/app-toolkit/testing';
import { SpaceProperties } from '@dxos/client-protocol/types';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Database, Filter, Obj, Query, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';

import { SpaceOperation } from '#types';

import { rootCollectionRule } from '../capabilities/default-parent.ts';
import AddObjectHandler from './add-object.ts';
import AddTypeHandler from './add-type.ts';
import { TestObject, decodeNamed, makeTestLayer } from './testing.ts';

const TestLayer = makeTestLayer(AddObjectHandler, AddTypeHandler);

/** The app's capability manager carrying plugin-space's default-parent rule, as the invoker supplies it. */
const withDefaultParents = <A, E, R>(effect: Effect.Effect<A, E, R>) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  manager.contribute({ module: 'test', interface: AppCapabilities.DefaultParent, implementation: rootCollectionRule });
  return effect.pipe(Effect.provideService(Capability.Service, manager));
};

const getRootCollection = Effect.gen(function* () {
  const [properties] = yield* Database.query(Filter.type(SpaceProperties)).run;
  const ref = Annotation.get(properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined);
  return ref ? yield* Database.load(ref) : undefined;
});

describe('SpaceOperation.AddObject', () => {
  it.effect(
    'files a live object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: Obj.make(TestObject, { name: 'held' }),
        });
        expect(decodeNamed(object).name).toBe('held');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'instantiates a draft against a registered type, keeping every field',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'com.example.type.testObject', 'name': 'drafted', 'description': 'kept' },
        });
        expect(decodeNamed(object).name).toBe('drafted');
        expect((object as { description?: string }).description).toBe('kept');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a draft filed into a collection is persisted and owned by it',
    Effect.fnUntraced(
      function* ({ expect }) {
        const collection = yield* Database.add(Collection.make({ objects: [] }));
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'com.example.type.testObject', 'name': 'filed' },
          target: collection,
        });

        // The ref the collection now holds has to resolve, so the object must be in the database.
        expect(Obj.getDatabase(object as Obj.Any)).toBeDefined();
        expect(collection.objects.map((ref) => ref.peek()?.id)).toEqual([object.id]);
        expect(Obj.getParent(object as Obj.Any)?.id).toBe(collection.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'without a target the object is persisted outside every collection',
    Effect.fnUntraced(
      function* ({ expect }) {
        const collection = yield* Database.add(Collection.make({ objects: [] }));
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'com.example.type.testObject', 'name': 'loose' },
        });

        const found = yield* Database.query(Query.select(Filter.type(TestObject))).run;
        expect(found.map((entity) => entity.id)).toContain(object.id);
        expect(collection.objects).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'without a target a collection-item type files into the root collection',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'org.dxos.type.collection', 'name': 'filed', 'objects': [] },
        }).pipe(withDefaultParents);

        const root = yield* getRootCollection;
        expect(root?.objects.map((ref) => ref.peek()?.id)).toEqual([object.id]);
        expect(Obj.getParent(object as Obj.Any)?.id).toBe(root?.id);
      },
      WithProperties,
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'the root collection is created for a space that has none yet',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Database.add(Obj.make(SpaceProperties, {}));
        const { object } = yield* Operation.invoke(SpaceOperation.AddObject, {
          object: { '@type': 'org.dxos.type.collection', 'name': 'filed', 'objects': [] },
        }).pipe(withDefaultParents);

        const root = yield* getRootCollection;
        expect(root?.objects.map((ref) => ref.peek()?.id)).toEqual([object.id]);
        // Persisted, not only referenced: a parent missing from the space drops the object from every query.
        expect(root && Obj.getDatabase(root)).toBeDefined();
        expect(Obj.getParent(object as Obj.Any)?.id).toBe(root?.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a collection that does not take the type fails without writing anything',
    Effect.fnUntraced(
      function* ({ expect }) {
        const collection = yield* Database.add(Collection.make({ objects: [] }));
        const exit = yield* Effect.exit(
          Operation.invoke(SpaceOperation.AddObject, {
            object: { '@type': Type.getTypename(Tag.Tag), 'label': 'internal' },
            target: collection,
          }),
        );

        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('does not take');
        expect(yield* Database.query(Filter.type(Tag.Tag)).run).toHaveLength(0);
        expect(collection.objects).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a target collection outside the invocation space is refused, not filed across databases',
    Effect.fnUntraced(
      function* ({ expect }) {
        // A collection that is not in the invocation's database — detached here, the same shape a
        // collection from another space presents. Filing into it would persist the object in one
        // place and push its reference somewhere else.
        const foreign = Collection.make({ objects: [] });
        const exit = yield* Effect.exit(
          Operation.invoke(SpaceOperation.AddObject, {
            object: { '@type': 'com.example.type.testObject', 'name': 'stray' },
            target: foreign,
          }),
        );
        expect(exit._tag).toBe('Failure');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'an unknown typename fails with the name, not a defect',
    Effect.fnUntraced(
      function* ({ expect }) {
        const exit = yield* Effect.exit(
          Operation.invoke(SpaceOperation.AddObject, { object: { '@type': 'com.example.type.missing' } }),
        );
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('Schema not found: com.example.type.missing');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a draft violating its schema fails with the validation message, not a defect',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(SpaceOperation.AddType, {
          typename: 'com.example.type.strict',
          name: 'Strict',
          jsonSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: 'Strict',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        });

        const exit = yield* Effect.exit(
          Operation.invoke(SpaceOperation.AddObject, { object: { '@type': 'com.example.type.strict' } }),
        );
        expect(exit._tag).toBe('Failure');
        expect(String(exit)).toContain('Invalid draft for com.example.type.strict');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
