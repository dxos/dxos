//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Operation, Skill } from '@dxos/compute';
import { Database, Entity, Feed, Filter, JsonSchema, Obj, Query, Ref, Relation, Scope, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EID, EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { DatabaseHandlers } from './operations';
import { Query as DatabaseQueryOperation, SchemaAdd } from './operations/definitions';
import DatabaseSkill from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Skill.Skill, Feed.Feed],
  skills: [DatabaseSkill.make()],
  tracing: 'pretty',
  aiServicePreset: 'edge-remote',
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

describe('Database Skill', () => {
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
    'schema-add: decodes a stringified jsonSchema at the tool-call boundary',
    Effect.fnUntraced(function* ({ expect }) {
      // Unconstrained tool parameters are sent to the LLM without a `type`, so some models serialize
      // the `jsonSchema` argument as a JSON string. The tool-call boundary decodes the operation input,
      // so decoding must yield an object whether the model passes a string or an object.
      const decode = Schema.decodeUnknown(SchemaAdd.input);
      const base = { name: 'Project', typename: 'com.example.type.project' };

      const fromString = yield* decode({ ...base, jsonSchema: JSON.stringify(PROJECT_JSON_SCHEMA) });
      expect(fromString.jsonSchema).toEqual(PROJECT_JSON_SCHEMA);

      const fromObject = yield* decode({ ...base, jsonSchema: PROJECT_JSON_SCHEMA });
      expect(fromObject.jsonSchema).toEqual(PROJECT_JSON_SCHEMA);
    }),
  );

  it.effect(
    'schema-add: creates a schema with the declared fields',
    Effect.fnUntraced(
      function* ({ expect }) {
        // Decode through the operation input to mirror the tool-call boundary (a model may pass the schema
        // as a JSON string), then run the handler and assert the created type carries the declared fields.
        const input = yield* Schema.decodeUnknown(SchemaAdd.input)({
          name: 'Project',
          typename: 'com.example.type.project',
          jsonSchema: JSON.stringify(PROJECT_JSON_SCHEMA),
        });
        yield* Operation.invoke(SchemaAdd, input);

        const allTypes = yield* Database.query(
          Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry()),
        ).run;
        const schemas = allTypes.filter((type) => Type.getTypename(type) === 'com.example.type.project');
        expect(schemas).toHaveLength(1);
        const properties = JsonSchema.toJsonSchema(schemas[0]).properties ?? {};
        expect(Object.keys(properties)).toEqual(expect.arrayContaining(['name', 'description', 'status']));
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
        const properties = JsonSchema.toJsonSchema(schemas[0]).properties ?? {};
        expect(Object.keys(properties)).toEqual(expect.arrayContaining(['name', 'description', 'status']));
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
    'object-create: create an object',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* agent.submitPrompt('Create a new organization called "Cyberdyne Systems".');
        yield* agent.waitForCompletion();
        const orgs = yield* Database.query(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' })).run;
        expect(orgs).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'object-create: create an object with a reference',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* agent.submitPrompt(
          'Create a preson fullName="John Doe" with a reference to the organization "Cyberdyne Systems".',
        );
        yield* agent.waitForCompletion();
        const orgs = yield* Database.query(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' })).run;
        const persons = yield* Database.query(Query.type(Person.Person, { fullName: 'John Doe' })).run;
        expect(orgs).toHaveLength(1);
        expect(persons).toHaveLength(1);
        expect(persons[0].organization?.target).toBe(orgs[0]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'object-delete: delete an object',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Obsolete Corp' }));
        yield* agent.submitPrompt(`Delete the organization "Obsolete Corp".`);
        yield* agent.waitForCompletion();
        expect(Obj.isDeleted(org)).toBe(true);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'object-update: update an object',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Old Name Inc' }));
        yield* agent.submitPrompt(`Update the organization "Old Name Inc" and change its name to "New Name Corp".`);
        yield* agent.waitForCompletion();
        expect(org.name).toBe('New Name Corp');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  //
  // Query & Load
  //

  it.effect(
    'query: search for objects',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
        yield* agent.submitPrompt('Search for all organizations. How many are there?');
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'load: load object details',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        const org = yield* Database.add(
          Obj.make(Organization.Organization, { name: 'Detail Corp', description: 'A detailed organization.' }),
        );
        const uri = Obj.getURI(org);
        yield* agent.submitPrompt(`Load the full details of object ${uri}. What is its description?`);
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  //
  // Relations
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
        const ref = db.makeRef(Obj.getURI(org)) as Ref.Ref<any>;
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

  it.effect(
    'query: includeQueues finds mock email in feed (agent uses Query tool)',
    Effect.fnUntraced(
      function* (_) {
        const feed = Feed.make();
        yield* Database.add(feed);
        yield* Feed.append(feed, [
          Obj.make(Organization.Organization, {
            name: 'Lot Booking Co',
            description: 'Mock email body: your parking reservation is confirmed.',
          }),
        ]);
        yield* Database.flush();

        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* agent.submitPrompt(trim`
          A mock email was stored only on a feed (queue), not as a regular space document: organization "Lot Booking Co"
          mentioning a parking reservation.

          Use the Query tool once: full-text "reservation", includeQueues true, includeContent false, limit 20.
          Confirm the results include Lot Booking Co.
        `);
        yield* agent.waitForCompletion();

        const { db } = yield* Database.Service;
        const spaceOnly = yield* Database.query(
          Query.select(Filter.text('reservation', { type: 'full-text' })).limit(20),
        ).run;
        expect(spaceOnly).toHaveLength(0);

        const withFeeds = yield* Database.query(
          Query.select(Filter.text('reservation', { type: 'full-text' }))
            .from(db, { includeFeeds: true })
            .limit(20),
        ).run;
        expect(withFeeds.length).toBeGreaterThanOrEqual(1);
        expect(
          withFeeds.some(
            (obj) =>
              Obj.getTypename(obj) === 'org.dxos.type.organization' &&
              String(Obj.getLabel(obj) ?? '').includes('Lot Booking'),
          ),
        ).toBe(true);

        const byTypename = yield* Database.query(
          Query.type(Organization.Organization).from(db, { includeFeeds: true }).limit(20),
        ).run;
        expect(byTypename.length).toBeGreaterThanOrEqual(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
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

        const noQueues = yield* Operation.invoke(DatabaseQueryOperation, {
          text: 'op-search-token-7f3a2c91',
          includeQueues: false,
          limit: 20,
        });
        expect(noQueues).toHaveLength(0);

        const withQueues = yield* Operation.invoke(DatabaseQueryOperation, {
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

        const byTypename = yield* Operation.invoke(DatabaseQueryOperation, {
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

  it.effect(
    'query: in param scopes to feed children (agent uses Query tool)',
    Effect.fnUntraced(
      function* (_) {
        const feed1 = Feed.make({ name: 'inbox-1' });
        yield* Database.add(feed1);
        yield* Feed.append(feed1, [
          Obj.make(Organization.Organization, {
            name: 'Email Corp Alpha',
            description: 'Mock email in-param-token-a1b2c3.',
          }),
        ]);

        const feed2 = Feed.make({ name: 'inbox-2' });
        yield* Database.add(feed2);
        yield* Feed.append(feed2, [
          Obj.make(Organization.Organization, {
            name: 'Email Corp Beta',
            description: 'Mock email in-param-token-d4e5f6.',
          }),
        ]);
        yield* Database.flush();

        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* agent.submitPrompt('Query for organizations in "inbox-1" feed.');
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'query operation: in param can be passed as string',
    Effect.fnUntraced(
      function* (_) {
        const feed1 = Feed.make({ name: 'inbox-1' });
        yield* Database.add(feed1);
        yield* Feed.append(feed1, [
          Obj.make(Organization.Organization, {
            name: 'Email Corp Alpha',
            description: 'Mock email in-param-invoke-token-a1b2c3.',
          }),
        ]);

        const feed2 = Feed.make({ name: 'inbox-2' });
        yield* Database.add(feed2);
        yield* Feed.append(feed2, [
          Obj.make(Organization.Organization, {
            name: 'Email Corp Beta',
            description: 'Mock email in-param-invoke-token-d4e5f6.',
          }),
        ]);
        yield* Database.flush();

        const agent = yield* AgentService.createSession({
          skills: [DatabaseSkill.make()],
        });
        yield* agent.submitPrompt(
          `Call query tool with precisely ${JSON.stringify({
            includeContent: false,
            limit: 10,
            typename: Type.getTypename(Organization.Organization),
            in: [Obj.getURI(feed1)],
          })}`,
        );
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
