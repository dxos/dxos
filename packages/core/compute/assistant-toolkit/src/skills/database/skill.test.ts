//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer, operationToolCall } from '@dxos/agent-runtime/testing';
import { ScriptedAiService } from '@dxos/ai/testing';
import { Operation, Skill } from '@dxos/compute';
import { Database, Entity, Feed, Filter, JsonSchema, Obj, Query, Ref, Relation, Scope, Tag, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EID } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { DatabaseHandlers } from './operations';
import { Query as DatabaseQueryOperation, ObjectCreate, SchemaAdd, SchemaList } from './operations/definitions';
import DatabaseSkill from './skill';

// The agent's tool-calling behaviour is scripted inline per test via a mock model (no recorded
// conversation to regenerate). Tool-call inputs are type-checked against each operation's input
// schema through `operationToolCall`; a schema change surfaces here as a compile error. Where a
// tool references an object created at run time, the ref is resolved lazily from a mutable holder the
// test fills before submitting the prompt.
const testLayer = (script: ScriptedAiService.Script) =>
  AssistantTestLayer({
    operationHandlers: DatabaseHandlers,
    types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Skill.Skill, Feed.Feed],
    skills: [DatabaseSkill.make()],
    tracing: 'pretty',
    aiService: ScriptedAiService.layer(script),
  });

const ORGANIZATION = Type.getTypename(Organization.Organization);
const PERSON = Type.getTypename(Person.Person);
const EMPLOYER = Type.getTypename(Employer.Employer);

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
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
        yield* agent.submitPrompt('List all available schemas. Tell me what typenames are available.');
        yield* agent.waitForCompletion();
      },
      Effect.provide(testLayer([operationToolCall(SchemaList, {}), ScriptedAiService.text('Those are the schemas.')])),
      TestHelpers.provideTestContext,
    ),
  );

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
      // Direct operation invocation — no agent, so no scripted turns are consumed.
      Effect.provide(testLayer([])),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'schema-add: add a new schema',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
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
      Effect.provide(
        testLayer([
          operationToolCall(SchemaAdd, {
            name: 'Project',
            typename: 'com.example.type.project',
            jsonSchema: PROJECT_JSON_SCHEMA,
          }),
          ScriptedAiService.text('Added the Project schema.'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  //
  // Objects
  //

  it.effect(
    'object-create: create an object',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
        yield* agent.submitPrompt('Create a new organization called "Cyberdyne Systems".');
        yield* agent.waitForCompletion();
        const orgs = yield* Database.query(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' })).run;
        expect(orgs).toHaveLength(1);
      },
      Effect.provide(
        testLayer([
          operationToolCall(ObjectCreate, { typename: ORGANIZATION, properties: { name: 'Cyberdyne Systems' } }),
          ScriptedAiService.text('Created the organization.'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'object-create: create an object with a reference',
    (() => {
      const ref: { org?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          // Pre-create the referenced organization; the agent creates the person referencing it.
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
          ref.org = Obj.getURI(org);
          yield* agent.submitPrompt(
            'Create a person fullName="John Doe" with a reference to the organization "Cyberdyne Systems".',
          );
          yield* agent.waitForCompletion();
          const orgs = yield* Database.query(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' })).run;
          const persons = yield* Database.query(Query.type(Person.Person, { fullName: 'John Doe' })).run;
          expect(orgs).toHaveLength(1);
          expect(persons).toHaveLength(1);
          expect(persons[0].organization?.target).toBe(orgs[0]);
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('create-object', () => ({
              typename: PERSON,
              // A reference inside `properties` uses the ref-link form (bare strings are only decoded
              // for top-level ref parameters); see the ObjectCreate tool description.
              properties: { fullName: 'John Doe', organization: { '/': ref.org } },
            })),
            ScriptedAiService.text('Created the person with a reference.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'object-delete: delete an object',
    (() => {
      const ref: { obj?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Obsolete Corp' }));
          ref.obj = Obj.getURI(org);
          yield* agent.submitPrompt('Delete the organization "Obsolete Corp".');
          yield* agent.waitForCompletion();
          expect(Obj.isDeleted(org)).toBe(true);
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('delete-object', () => ({ obj: ref.obj })),
            ScriptedAiService.text('Deleted the organization.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'object-update: update an object',
    (() => {
      const ref: { obj?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Old Name Inc' }));
          ref.obj = Obj.getURI(org);
          yield* agent.submitPrompt('Update the organization "Old Name Inc" and change its name to "New Name Corp".');
          yield* agent.waitForCompletion();
          expect(org.name).toBe('New Name Corp');
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('update-object', () => ({
              obj: ref.obj,
              properties: { name: 'New Name Corp' },
            })),
            ScriptedAiService.text('Renamed the organization.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  //
  // Query & Load
  //

  it.effect(
    'query: search for objects',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
        yield* agent.submitPrompt('Search for all organizations. How many are there?');
        yield* agent.waitForCompletion();
      },
      Effect.provide(
        testLayer([
          operationToolCall(DatabaseQueryOperation, { typename: ORGANIZATION, includeContent: true }),
          ScriptedAiService.text('There are two organizations.'),
        ]),
      ),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'load: load object details',
    (() => {
      const ref: { obj?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const org = yield* Database.add(
            Obj.make(Organization.Organization, { name: 'Detail Corp', description: 'A detailed organization.' }),
          );
          ref.obj = Obj.getURI(org);
          yield* agent.submitPrompt(`Load the full details of object ${ref.obj}. What is its description?`);
          yield* agent.waitForCompletion();
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('load-object', () => ({ refs: [ref.obj] })),
            ScriptedAiService.text('Its description is: A detailed organization.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  //
  // Relations
  //

  it.effect(
    'relation-create: create a relation between objects',
    (() => {
      const ref: { source?: string; target?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
          ref.source = Obj.getURI(person);
          ref.target = Obj.getURI(org);
          yield* agent.submitPrompt(
            'Create an Employer relation from person "John Connor" to organization "Cyberdyne Systems" with role "Engineer".',
          );
          yield* agent.waitForCompletion();
          const relations = yield* Database.query(Query.type(Employer.Employer)).run;
          expect(relations.length).toBeGreaterThanOrEqual(1);
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('create-relation', () => ({
              typename: EMPLOYER,
              source: ref.source,
              target: ref.target,
              properties: { role: 'Engineer' },
            })),
            ScriptedAiService.text('Created the Employer relation.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'relation-delete: delete a relation',
    (() => {
      const ref: { rel?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'Sarah Connor' }));
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
          const relation = yield* Database.add(
            Relation.make(Employer.Employer, {
              [Relation.Source]: person,
              [Relation.Target]: org,
              role: 'Director',
            }),
          );
          ref.rel = Relation.getURI(relation);
          yield* agent.submitPrompt(`Delete the relation ${ref.rel}.`);
          yield* agent.waitForCompletion();
          expect(Relation.isDeleted(relation)).toBe(true);
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('delete-relation', () => ({ rel: ref.rel })),
            ScriptedAiService.text('Deleted the relation.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  //
  // Tags
  //

  it.effect(
    'tag-add: add a tag to an object',
    (() => {
      const ref: { tag?: string; obj?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
          const tag = yield* Database.add(Tag.make({ label: 'important' }));
          ref.obj = Obj.getURI(org);
          ref.tag = Obj.getURI(tag);
          yield* agent.submitPrompt('Add tag "important" to the organization "Tagged Corp".');
          yield* agent.waitForCompletion();
          // Compare by entity id: a same-space ref stores a local EID (`echo:/<id>`) while
          // `Obj.getURI` returns the fully-qualified form (`echo://<space>/<id>`).
          const taggedIds = Obj.getMeta(org).tags.map((tagRef) => EID.getEntityId(EID.parse(tagRef.uri)));
          expect(taggedIds).toContain(tag.id);
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('add-tag', () => ({ tag: ref.tag, obj: ref.obj })),
            ScriptedAiService.text('Tagged the organization.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'tag-remove: remove a tag from an object',
    (() => {
      const ref: { tag?: string; obj?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Untagged Corp' }));
          const tag = yield* Database.add(Tag.make({ label: 'obsolete' }));
          ref.obj = Obj.getURI(org);
          ref.tag = Obj.getURI(tag);
          // Compare by entity id (local vs fully-qualified EID forms refer to the same object).
          const taggedIds = () => Obj.getMeta(org).tags.map((tagRef) => EID.getEntityId(EID.parse(tagRef.uri)));
          Entity.update(org, (org) => Entity.addTag(org, Ref.make(tag)));
          expect(taggedIds()).toContain(tag.id);
          yield* agent.submitPrompt('Remove tag "obsolete" from the organization "Untagged Corp".');
          yield* agent.waitForCompletion();
          expect(taggedIds()).not.toContain(tag.id);
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('remove-tag', () => ({ tag: ref.tag, obj: ref.obj })),
            ScriptedAiService.text('Removed the tag.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  //
  // Context
  //

  it.effect(
    'context-add: add object to chat context',
    (() => {
      const ref: { obj?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Context Corp' }));
          ref.obj = Obj.getURI(org);
          yield* agent.submitPrompt('Add the organization "Context Corp" to the chat context.');
          yield* agent.waitForCompletion();
          const contextRefs = yield* agent.getContext();
          expect(contextRefs.length).toBeGreaterThanOrEqual(1);
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('add-to-context', () => ({ obj: ref.obj })),
            ScriptedAiService.text('Added to the context.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'context-remove: remove object from chat context',
    (() => {
      const ref: { obj?: string } = {};
      return Effect.fnUntraced(
        function* (_) {
          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Remove Context Corp' }));
          const { db } = yield* Database.Service;
          const contextRef = db.makeRef(Obj.getURI(org)) as Ref.Ref<any>;
          yield* agent.addContext([contextRef]);
          ref.obj = Obj.getURI(org);
          yield* agent.submitPrompt('Remove the organization "Remove Context Corp" from the chat context.');
          yield* agent.waitForCompletion();
          const contextRefs = yield* agent.getContext();
          const found = contextRefs.find((entry) => entry.uri === ref.obj);
          expect(found).toBeUndefined();
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('remove-from-context', () => ({ obj: ref.obj })),
            ScriptedAiService.text('Removed from the context.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
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

        const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
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
      Effect.provide(
        testLayer([
          operationToolCall(DatabaseQueryOperation, {
            text: 'reservation',
            includeQueues: true,
            includeContent: false,
            limit: 20,
          }),
          ScriptedAiService.text('The results include Lot Booking Co.'),
        ]),
      ),
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
      // Direct operation invocation — no agent, so no scripted turns are consumed.
      Effect.provide(testLayer([])),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'query: in param scopes to feed children (agent uses Query tool)',
    (() => {
      const ref: { feed1?: string } = {};
      return Effect.fnUntraced(
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
          ref.feed1 = Obj.getURI(feed1);

          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          yield* agent.submitPrompt('Query for organizations in "inbox-1" feed.');
          yield* agent.waitForCompletion();
        },
        Effect.provide(
          testLayer([
            ScriptedAiService.toolCall('query', () => ({ typename: ORGANIZATION, in: [ref.feed1] })),
            ScriptedAiService.text('Found the organizations in inbox-1.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );

  it.effect(
    'query operation: in param can be passed as string',
    (() => {
      const ref: { feed1?: string } = {};
      return Effect.fnUntraced(
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
          ref.feed1 = Obj.getURI(feed1);

          const agent = yield* AgentService.createSession({ skills: [DatabaseSkill.make()] });
          yield* agent.submitPrompt(`Call query tool with the "in" scoped to feed ${ref.feed1}.`);
          yield* agent.waitForCompletion();
        },
        Effect.provide(
          testLayer([
            // The `in` param accepts a plain URI string (decoded to a ref) as well as a ref object.
            ScriptedAiService.toolCall('query', () => ({
              includeContent: false,
              limit: 10,
              typename: ORGANIZATION,
              in: [ref.feed1],
            })),
            ScriptedAiService.text('Queried inbox-1.'),
          ]),
        ),
        TestHelpers.provideTestContext,
      );
    })(),
  );
});

// Asserts that the type's JSON Schema declares (at least) the given property names.
const expectSchemaProperties = (schema: Parameters<typeof JsonSchema.toJsonSchema>[0], expectedKeys: string[]) => {
  const properties = JsonSchema.toJsonSchema(schema).properties ?? {};
  expect(Object.keys(properties)).toEqual(expect.arrayContaining(expectedKeys));
};
