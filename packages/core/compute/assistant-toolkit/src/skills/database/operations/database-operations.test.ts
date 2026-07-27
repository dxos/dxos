//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, Skill } from '@dxos/compute';
import { Database, Feed, Filter, JsonSchema, Obj, Query, Ref, Scope, Tag, Type } from '@dxos/echo';
import { EncodedReference } from '@dxos/echo-protocol';
import { TestHelpers } from '@dxos/effect/testing';
import { EID, EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseSkill from '../skill';
import {
  ContextAdd,
  ContextRemove,
  Load,
  ObjectCreate,
  ObjectDelete,
  ObjectUpdate,
  Query as QueryOperation,
  RelationCreate,
  SchemaAdd,
  SchemaList,
  TagAdd,
  TagRemove,
} from './definitions';
import { DatabaseHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

// A representative draft-07 JSON Schema as a model would emit for the `add-schema` tool.
const PROJECT_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Project',
  properties: {
    name: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string' },
  },
  required: ['name'],
};

// These drive each handler directly, so no model is involved. Agent-level behaviour for this skill
// is graded out-of-band by `database.eval.ts` in @dxos/assistant-evals.
const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [
    Organization.Organization,
    Person.Person,
    Employer.Employer,
    Tag.Tag,
    Skill.Skill,
    Feed.Feed,
    AiContext.Binding,
  ],
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
  // Query
  //

  it.effect(
    'query: finds objects by typename',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
        yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          limit: 20,
        });

        const rows = yield* Schema.decodeUnknown(Schema.Array(Schema.Struct({ label: Schema.String })))(results);
        expect(rows.map((row) => row.label).sort()).toEqual(['Acme Corp', 'Globex Industries']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query: the in param scopes results to the given feed',
    Effect.fnUntraced(
      function* ({ expect }) {
        const inbox1 = Feed.make({ name: 'inbox-1' });
        yield* Database.add(inbox1);
        yield* Feed.append(inbox1, [Obj.make(Organization.Organization, { name: 'Email Corp Alpha' })]);

        const inbox2 = Feed.make({ name: 'inbox-2' });
        yield* Database.add(inbox2);
        yield* Feed.append(inbox2, [Obj.make(Organization.Organization, { name: 'Email Corp Beta' })]);
        yield* Database.flush();

        const results = yield* Operation.invoke(QueryOperation, {
          typename: Type.getTypename(Organization.Organization),
          in: [Ref.make(inbox1)],
          includeQueues: true,
          limit: 20,
        });

        const rows = yield* Schema.decodeUnknown(Schema.Array(Schema.Struct({ label: Schema.String })))(results);
        expect(rows.map((row) => row.label)).toEqual(['Email Corp Alpha']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query operation: includeQueues via invokeFunction',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = Feed.make();
        yield* Database.add(feed);
        yield* Feed.append(feed, [
          Obj.make(Organization.Organization, {
            name: 'Invoke Op Lot Co',
            description: 'Feed-only mock email op-search-token-7f3a2c91 reservation line.',
          }),
        ]);
        yield* Database.flush();

        const noQueues = yield* Operation.invoke(QueryOperation, {
          text: 'op-search-token-7f3a2c91',
          includeQueues: false,
          limit: 20,
        });
        expect(noQueues).toHaveLength(0);

        const withQueues = yield* Operation.invoke(QueryOperation, {
          text: 'op-search-token-7f3a2c91',
          includeQueues: true,
          limit: 20,
        });
        type QueryRow = { typename?: string; label?: string };
        expect(withQueues.length).toBeGreaterThanOrEqual(1);
        expect(
          (withQueues as QueryRow[]).some(
            (row) => row.typename === 'org.dxos.type.organization' && String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);

        const byTypename = yield* Operation.invoke(QueryOperation, {
          typename: 'org.dxos.type.organization',
          includeQueues: true,
          limit: 20,
        });
        expect(byTypename.length).toBeGreaterThanOrEqual(1);
        expect(
          (byTypename as QueryRow[]).some(
            (row) => row.typename === 'org.dxos.type.organization' && String(row.label ?? '').includes('Invoke Op Lot'),
          ),
        ).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // Context
  //

  it.effect(
    'context-add: binds the object to the conversation',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Context Corp' }));
        yield* Database.flush();

        yield* Operation.invoke(ContextAdd, { obj: Ref.make(organization) }).pipe(
          Effect.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(feed) })),
        );

        const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
        const added = bindings.flatMap((binding) => entityIds(binding.objects.added));
        expect(added).toContain(organization.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'context-remove: unbinds the object from the conversation',
    Effect.fnUntraced(
      function* ({ expect }) {
        const feed = yield* Database.add(Feed.make());
        const organization = yield* Database.add(Obj.make(Organization.Organization, { name: 'Remove Context Corp' }));
        yield* Database.flush();

        const conversation = Operation.withInvocationOptions({ conversation: Obj.getURI(feed) });
        yield* Operation.invoke(ContextAdd, { obj: Ref.make(organization) }).pipe(Effect.provide(conversation));
        yield* Operation.invoke(ContextRemove, { obj: Ref.make(organization) }).pipe(Effect.provide(conversation));

        const bindings = yield* Feed.query(feed, Query.type(AiContext.Binding)).run;
        const removed = bindings.flatMap((binding) => entityIds(binding.objects.removed));
        expect(removed).toContain(organization.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // Schema
  //

  it.effect(
    'schema-add: requires jsonSchema to be an object',
    Effect.fnUntraced(function* ({ expect }) {
      // The tool parameter is typed as an object so the model emits the JSON Schema as an object.
      // An unconstrained parameter let some models emit a JSON-encoded string, which then corrupted
      // the created type; a non-object is now rejected at the tool-call boundary.
      const decode = Schema.decodeUnknown(SchemaAdd.input);
      const base = { name: 'Project', typename: 'com.example.type.project' };

      const fromObject = yield* decode({ ...base, jsonSchema: PROJECT_JSON_SCHEMA });
      expect(fromObject.jsonSchema).toEqual(PROJECT_JSON_SCHEMA);

      const fromString = yield* Effect.either(decode({ ...base, jsonSchema: JSON.stringify(PROJECT_JSON_SCHEMA) }));
      expect(fromString._tag).toBe('Left');
    }),
  );

  it.effect(
    'schema-add: creates a schema with the declared fields',
    Effect.fnUntraced(
      function* ({ expect }) {
        // Run the handler and assert the created type carries the declared fields, not merely that a
        // type with the typename exists.
        yield* Operation.invoke(SchemaAdd, {
          name: 'Project',
          typename: 'com.example.type.project',
          jsonSchema: PROJECT_JSON_SCHEMA,
        });

        const allTypes = yield* Database.query(
          Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()),
        ).run;
        const schemas = allTypes.filter((type) => Type.getTypename(type) === 'com.example.type.project');
        expect(schemas).toHaveLength(1);
        expectSchemaProperties(schemas[0], ['name', 'description', 'status']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

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
const entityIds = (refs: readonly Ref.Ref<Obj.Unknown>[]): (string | undefined)[] =>
  refs.map((ref) => EID.getEntityId(EID.parse(ref.uri)));

const taggedIds = (obj: Obj.Any): (string | undefined)[] =>
  Obj.getMeta(obj).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));

// Asserts that the type's JSON Schema declares (at least) the given property names.
const expectSchemaProperties = (schema: Parameters<typeof JsonSchema.toJsonSchema>[0], expectedKeys: string[]) => {
  const properties = JsonSchema.toJsonSchema(schema).properties ?? {};
  expect(Object.keys(properties)).toEqual(expect.arrayContaining(expectedKeys));
};
