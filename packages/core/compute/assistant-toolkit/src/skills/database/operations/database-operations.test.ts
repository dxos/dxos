//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Query, Ref, Tag, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import {
  Load,
  ObjectCreate,
  ObjectDelete,
  ObjectUpdate,
  RelationCreate,
  SchemaList,
  TagAdd,
  TagRemove,
} from './definitions';
import { DatabaseHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

// These drive each handler directly, so no model is involved; the agent-driven counterparts in
// ../skill.test.ts stay behind the memoized gate.
const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Skill.Skill, Feed.Feed],
  skills: [DatabaseSkill.make()],
  disableLlmMemoization: true,
});

describe('DatabaseOperations', () => {
  //
  // Objects
  //

  it.effect(
    'object-create: creates an object with the declared properties',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Operation.invoke(ObjectCreate, {
          typename: Type.getTypename(Organization.Organization),
          properties: { name: 'Cyberdyne Systems' },
        });

        const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
        expect(organizations).toHaveLength(1);
        expect(organizations[0].name).toBe('Cyberdyne Systems');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-create: resolves an encoded reference into a live ref',
    Effect.fnUntraced(
      function* ({ expect }) {
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
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-update: writes the given properties onto the object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Before' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectUpdate, {
          obj: Ref.make(organization),
          properties: { name: 'After', description: 'Now with a description.' },
        });

        expect(organization.name).toBe('After');
        expect(organization.description).toBe('Now with a description.');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-delete: removes the object from the database',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Doomed Corp' }));
        yield* Database.flush();

        yield* Operation.invoke(ObjectDelete, { obj: Ref.make(organization) });
        yield* Database.flush();

        const organizations = yield* Database.query(Query.type(Organization.Organization)).run;
        expect(organizations).toHaveLength(0);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'load: returns one entry per requested ref',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const loaded = yield* Operation.invoke(Load, { refs: [Ref.make(organization), Ref.make(person)] });

        const rows = yield* Schema.decodeUnknown(Schema.Array(Schema.Struct({ id: Schema.String })))(loaded);
        expect(rows.map((row) => row.id)).toEqual([organization.id, person.id]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // Schema
  //

  it.effect(
    'schema-list: lists registered types and omits the excluded ones',
    Effect.fnUntraced(
      function* ({ expect }) {
        const schemas = yield* Operation.invoke(SchemaList, {});

        const rows = yield* Schema.decodeUnknown(
          Schema.Array(Schema.Struct({ typename: Schema.String, kind: Schema.String })),
        )(schemas);
        const typenames = rows.map((row) => row.typename);
        expect(typenames).toContain(Type.getTypename(Organization.Organization));
        expect(typenames).toContain(Type.getTypename(Person.Person));
        // Skill and Feed are on the handler's exclusion list, which keeps them out of the agent's context.
        expect(typenames).not.toContain(Type.getTypename(Skill.Skill));
        expect(typenames).not.toContain(Type.getTypename(Feed.Feed));
        expect(rows.find((row) => row.typename === Type.getTypename(Employer.Employer))?.kind).toBe('relation');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // Relations
  //

  it.effect(
    'relation-create: links source to target and stores the properties',
    Effect.fnUntraced(
      function* ({ expect }) {
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* Database.flush();

        yield* Operation.invoke(RelationCreate, {
          typename: Type.getTypename(Employer.Employer),
          source: Ref.make(person),
          target: Ref.make(organization),
          properties: { role: 'Engineer' },
        });

        const relations = yield* Database.query(Query.type(Employer.Employer)).run;
        expect(relations).toHaveLength(1);
        expect(relations[0].role).toBe('Engineer');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  // TODO(wittjosiah): Cover RelationDelete once `Ref.Ref(Relation.Unknown)` is typeable. Its last
  // overload in `echo/src/Ref.ts` intersects unconditionally with `Obj.Unknown`, so for a relation
  // schema the object and relation kind brands collapse the ref to `Ref<never>` — the exact
  // collapse the preceding overload's comment warns about — leaving the operation impossible to
  // invoke from typed code without a cast.

  //
  // Tags
  //

  it.effect(
    'tag-add: attaches the tag to the object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        yield* Database.flush();

        yield* Operation.invoke(TagAdd, { tag: Ref.make(tag), obj: Ref.make(organization) });

        expect(taggedIds(organization)).toContain(tag.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'tag-remove: detaches the tag from the object',
    Effect.fnUntraced(
      function* ({ expect }) {
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        yield* Database.flush();
        yield* Operation.invoke(TagAdd, { tag: Ref.make(tag), obj: Ref.make(organization) });
        expect(taggedIds(organization)).toContain(tag.id);

        yield* Operation.invoke(TagRemove, { tag: Ref.make(tag), obj: Ref.make(organization) });

        expect(taggedIds(organization)).not.toContain(tag.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while `Obj.getURI`
// returns the fully-qualified form (`echo://<space>/<id>`).
const taggedIds = (obj: Obj.Any): (string | undefined)[] =>
  Obj.getMeta(obj).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));
