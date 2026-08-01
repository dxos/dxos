//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AppAnnotation } from '@dxos/app-toolkit';
import { SpaceProperties } from '@dxos/client-protocol';
import { Operation } from '@dxos/compute';
import { Annotation, Collection, Database, Obj, Query, Ref, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization, Person } from '@dxos/types';

import { OperationTestLayer } from '../../../testing';
import { ObjectCreate } from './definitions';

EntityId.dangerouslyDisableRandomness();

describe('ObjectCreate', () => {
  it.effect(
    'object-create: creates an object with the declared properties',
    Effect.fnUntraced(
      function* (_) {
        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Organization.Organization),
          properties: { name: 'Cyberdyne Systems' },
        });

        const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
        expect(organizations).toHaveLength(1);
        expect(organizations[0].name).toBe('Cyberdyne Systems');
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-create: resolves an encoded reference into a live ref',
    Effect.fnUntraced(
      function* (_) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Person.Person),
          properties: {
            fullName: 'John Doe',
            // The model emits references in this wire form; the handler decodes it to a ref.
            organization: EncodedReference.fromURI(Obj.getURI(organization)),
          },
        });

        const people = yield* Database.query(Query.type(Person.Person)).run;
        expect(people).toHaveLength(1);
        expect(people[0].organization?.target).toBe(organization);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-create: default leaves the root collection untouched',
    Effect.fnUntraced(
      function* (_) {
        const collection = yield* Database.add(Collection.make({ objects: [] }));
        const properties = yield* Database.add(Obj.make(SpaceProperties, {}));
        Obj.update(properties, (properties) => {
          const meta = Obj.getMeta(properties);
          meta.annotations ??= {};
          Annotation.setDictionary(meta.annotations, AppAnnotation.RootCollectionAnnotation, Ref.make(collection));
        });

        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Collection.Collection),
          properties: { name: 'Unattached', objects: [] },
        });

        expect(collection.objects).toHaveLength(0);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-create: attach files the object in the space root collection',
    Effect.fnUntraced(
      function* (_) {
        // Seed the root collection (mirrors plugin-markdown's `WithProperties` test helper;
        // TODO(burdon): factor out — see plugin-markdown/src/testing.ts).
        const collection = yield* Database.add(Collection.make({ objects: [] }));
        const properties = yield* Database.add(Obj.make(SpaceProperties, {}));
        Obj.update(properties, (properties) => {
          const meta = Obj.getMeta(properties);
          meta.annotations ??= {};
          Annotation.setDictionary(meta.annotations, AppAnnotation.RootCollectionAnnotation, Ref.make(collection));
        });

        // A collection is always collection-eligible; non-eligible types (no
        // `CollectionItemAnnotation`) are filed under navtree type nodes instead and skip the root.
        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Collection.Collection),
          properties: { name: 'Projects', objects: [] },
          attach: true,
        });

        const created = (yield* Database.query(Query.type(Collection.Collection)).run).find(
          (candidate) => candidate !== collection,
        );
        expect(created).toBeDefined();
        expect(collection.objects.map((ref) => ref.target)).toContain(created);
      },
      Effect.provide(OperationTestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
