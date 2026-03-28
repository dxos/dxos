//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Entity, Feed, Obj, Query, Ref, Relation, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import DatabaseBlueprint from './blueprint';
import { DatabaseHandlers } from './functions';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Blueprint.Blueprint, Feed.Feed],
  blueprints: [DatabaseBlueprint.make()],
  tracing: 'pretty',
});

describe('Database Blueprint', () => {
  //
  // Schema
  //

  it.effect(
    'schema-list: list available schemas',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [DatabaseBlueprint.make()],
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
    'schema-add: add a new schema',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [DatabaseBlueprint.make()],
        });
        yield* agent.submitPrompt(
          'Add a new schema called "Project" with typename "com.example.type.project" and fields: name (string), description (string), and status (string).',
        );
        yield* agent.waitForCompletion();
        const { db } = yield* Database.Service;
        const schemas = yield* Effect.promise(() =>
          db.schemaRegistry.query({ typename: 'com.example.type.project', location: ['database', 'runtime'] }).run(),
        );
        expect(schemas.length).toBeGreaterThanOrEqual(1);
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
          blueprints: [DatabaseBlueprint.make()],
        });
        yield* agent.submitPrompt('Create a new organization called "Cyberdyne Systems".');
        yield* agent.waitForCompletion();
        const orgs = yield* Database.runQuery(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' }));
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
          blueprints: [DatabaseBlueprint.make()],
        });
        yield* agent.submitPrompt(
          'Create a preson fullName="John Doe" with a reference to the organization "Cyberdyne Systems".',
        );
        yield* agent.waitForCompletion();
        const orgs = yield* Database.runQuery(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' }));
        const persons = yield* Database.runQuery(Query.type(Person.Person, { fullName: 'John Doe' }));
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
          blueprints: [DatabaseBlueprint.make()],
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
          blueprints: [DatabaseBlueprint.make()],
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
          blueprints: [DatabaseBlueprint.make()],
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
          blueprints: [DatabaseBlueprint.make()],
        });
        const org = yield* Database.add(
          Obj.make(Organization.Organization, { name: 'Detail Corp', description: 'A detailed organization.' }),
        );
        const dxn = Obj.getDXN(org).toString();
        yield* agent.submitPrompt(`Load the full details of object ${dxn}. What is its description?`);
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
          blueprints: [DatabaseBlueprint.make()],
        });
        yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* agent.submitPrompt(
          `Create an Employer relation from person "John Connor" to organization "Cyberdyne Systems" with role "Engineer". List schemas first to find the relation typename.`,
        );
        yield* agent.waitForCompletion();
        const relations = yield* Database.runQuery(Query.type(Employer.Employer));
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
          blueprints: [DatabaseBlueprint.make()],
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
        const relationDxn = Relation.getDXN(relation).toString();
        yield* agent.submitPrompt(`Delete the relation ${relationDxn}.`);
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
          blueprints: [DatabaseBlueprint.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        yield* agent.submitPrompt(`Add tag "important" to the organization "Tagged Corp".`);
        yield* agent.waitForCompletion();
        const tags = Obj.getMeta(org).tags ?? [];
        // TODO(dmaretskyi): matcher doesnt work with echo proxies.
        expect([...tags]).toContain(Obj.getDXN(tag).toString());
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
          blueprints: [DatabaseBlueprint.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Untagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'obsolete' }));
        const tagDxn = Obj.getDXN(tag).toString();
        Entity.change(org, (obj) => Entity.addTag(obj, tagDxn));
        expect(Obj.getMeta(org).tags ?? []).toContain(tagDxn);
        yield* agent.submitPrompt(`Remove tag "obsolete" from the organization "Untagged Corp".`);
        yield* agent.waitForCompletion();
        const tags = Obj.getMeta(org).tags ?? [];
        // TODO(dmaretskyi): matcher doesnt work with echo proxies.
        expect([...tags]).not.toContain(tagDxn);
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
          blueprints: [DatabaseBlueprint.make()],
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
          blueprints: [DatabaseBlueprint.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Remove Context Corp' }));
        const { db } = yield* Database.Service;
        const ref = db.makeRef(Obj.getDXN(org)) as Ref.Ref<any>;
        yield* agent.addContext([ref]);
        const dxn = Obj.getDXN(org).toString();
        yield* agent.submitPrompt(`Remove the organization "Remove Context Corp" from the chat context.`);
        yield* agent.waitForCompletion();
        const contextRefs = yield* agent.getContext();
        const found = contextRefs.find((contextRef) => contextRef.dxn.toString() === dxn);
        expect(found).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
