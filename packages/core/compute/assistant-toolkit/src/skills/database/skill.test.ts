//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Entity, Feed, Filter, JsonSchema, Obj, Query, Ref, Relation, Scope, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EID, EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import { DatabaseHandlers } from './operations';
import { SchemaAdd } from './operations/definitions';
import DatabaseSkill from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Skill.Skill, Feed.Feed],
  skills: [DatabaseSkill.make()],
  tracing: 'pretty',
  model: DXN.make('com.anthropic.model.claude-sonnet-4-6.default'),
  aiServicePreset: 'direct',
});

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

describe('Database Skill', { tags: ['model-fixture'] }, () => {
  //
  // Schema
  //

  it.effect(
    'schema-list: list available schemas',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* agent.submitPrompt('List all available schemas. Tell me what typenames are available.');
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'schema-add: requires jsonSchema to be an object',
    Effect.fnUntraced(function* ({ expect }) {
      // The tool parameter is typed as an object so the model emits the JSON Schema as an object.
      // An unconstrained parameter let some models emit a JSON-encoded string, which then corrupted
      // the created type; a non-object is now rejected at the tool-call boundary.
      const decode = Schema.decodeUnknownEffect(SchemaAdd.input);
      const base = { name: 'Project', typename: 'com.example.type.project' };

      const fromObject = yield* decode({ ...base, jsonSchema: PROJECT_JSON_SCHEMA });
      expect(fromObject.jsonSchema).toEqual(PROJECT_JSON_SCHEMA);

      const fromString = yield* Effect.result(decode({ ...base, jsonSchema: JSON.stringify(PROJECT_JSON_SCHEMA) }));
      expect(fromString._tag).toBe('Failure');
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
    'schema-add: add a new schema',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* agent.submitPrompt(
          'Add a new schema called "Project" with typename "com.example.type.project" and fields: name (string), description (string), and status (string).',
        );
        yield* agent.waitForCompletion();
        const allTypes = yield* Database.query(
          Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()),
        ).run;
        const schemas = allTypes.filter((t) => Type.getTypename(t) === 'com.example.type.project');
        expect(schemas.length).toBeGreaterThanOrEqual(1);
        // Verify the schema was created with the declared fields, not merely that a type with the
        // typename exists — a malformed `jsonSchema` payload would still produce a bare type.
        expectSchemaProperties(schemas[0], ['name', 'description', 'status']);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  //
  // Objects
  //

  it.effect(
    'relation-create: create a relation between objects',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* agent.submitPrompt(
          `Create an Employer relation from person "John Connor" to organization "Cyberdyne Systems" with role "Engineer". List schemas first to find the relation typename.`,
        );
        yield* agent.waitForCompletion();
        const relations = yield* Database.query(Query.type(Employer.Employer)).run;
        expect(relations.length).toBeGreaterThanOrEqual(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'relation-delete: delete a relation',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'Sarah Connor' }));
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        const relation = yield* Database.add(
          Relation.make(Employer.Employer, {
            [Relation.Source]: person,
            [Relation.Target]: org,
            role: 'Director',
          }),
        );
        const relationUri = Relation.getURI(relation);
        yield* agent.submitPrompt(`Delete the relation ${relationUri}.`);
        yield* agent.waitForCompletion();
        expect(Relation.isDeleted(relation)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  //
  // Tags
  //

  it.effect(
    'tag-add: add a tag to an object',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        yield* agent.submitPrompt(`Add tag "important" to the organization "Tagged Corp".`);
        yield* agent.waitForCompletion();
        // Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while
        // `Obj.getURI` returns the fully-qualified form (`echo://<space>/<id>`).
        const taggedIds = Obj.getMeta(org).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));
        expect(taggedIds).toContain(tag.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'tag-remove: remove a tag from an object',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Untagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'obsolete' }));
        // Compare by entity id (local vs fully-qualified EID forms refer to the same object).
        const taggedIds = () => Obj.getMeta(org).tags.map((ref) => EID.getEntityId(EID.parse(ref.uri)));
        Entity.update(org, (org) => Entity.addTag(org, Ref.make(tag)));
        expect(taggedIds()).toContain(tag.id);
        yield* agent.submitPrompt(`Remove tag "obsolete" from the organization "Untagged Corp".`);
        yield* agent.waitForCompletion();
        expect(taggedIds()).not.toContain(tag.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  //
  // Context
  //

  it.effect(
    'context-add: add object to chat context',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Context Corp' }));
        yield* agent.submitPrompt(`Add the organization "Context Corp" to the chat context.`);
        yield* agent.waitForCompletion();
        const contextRefs = yield* agent.getContext();
        expect(contextRefs.length).toBeGreaterThanOrEqual(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'context-remove: remove object from chat context',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Remove Context Corp' }));
        const { db } = yield* Database.Service;
        const ref = db.makeRef<Organization.Organization>(Obj.getURI(org));
        yield* agent.addContext([ref]);
        const uri = Obj.getURI(org);
        yield* agent.submitPrompt(`Remove the organization "Remove Context Corp" from the chat context.`);
        yield* agent.waitForCompletion();
        const contextRefs = yield* agent.getContext();
        const found = contextRefs.find((contextRef) => contextRef.uri === uri);
        expect(found).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});

// Asserts that the type's JSON Schema declares (at least) the given property names.
const expectSchemaProperties = (schema: Parameters<typeof JsonSchema.toJsonSchema>[0], expectedKeys: string[]) => {
  const properties = JsonSchema.toJsonSchema(schema).properties ?? {};
  expect(Object.keys(properties)).toEqual(expect.arrayContaining(expectedKeys));
};
