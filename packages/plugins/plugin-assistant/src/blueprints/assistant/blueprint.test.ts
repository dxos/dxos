//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiContextService, AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Database, Entity, Obj, Query, Ref, Relation, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { Employer, Organization, Person } from '@dxos/types';

import { AssistantFunctions } from './functions';
import AssistantBlueprint from './blueprint';
import { ObjectId } from '@dxos/keys';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  functions: [...Object.values(AssistantFunctions)],
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Blueprint.Blueprint],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer)));

const addAssistantBlueprint = Effect.fnUntraced(function* () {
  yield* AiContextService.bindContext({
    blueprints: [Ref.make(yield* Database.add(Obj.clone(AssistantBlueprint.make(), { deep: true })))],
  });
});

describe('Assistant Blueprint', () => {
  //
  // Schema
  //

  it.effect(
    'schema-list: list available schemas',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        const messages = yield* AiConversationService.run({
          prompt: 'List all available schemas. Tell me what typenames are available.',
        });
        const lastMessage = messages.at(-1);
        expect(lastMessage).toBeDefined();
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'schema-add: add a new schema',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        yield* AiConversationService.run({
          prompt:
            'Add a new schema called "Project" with typename "example.com/type/Project" and fields: name (string), description (string), and status (string).',
        });
        const { db } = yield* Database.Service;
        const schemas = yield* Effect.promise(() =>
          db.schemaRegistry.query({ typename: 'example.com/type/Project', location: ['database', 'runtime'] }).run(),
        );
        expect(schemas.length).toBeGreaterThanOrEqual(1);
      },
      provideTestLayers,
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
        yield* addAssistantBlueprint();
        yield* AiConversationService.run({
          prompt: 'Create a new organization called "Cyberdyne Systems".',
        });
        const orgs = yield* Database.runQuery(Query.type(Organization.Organization, { name: 'Cyberdyne Systems' }));
        expect(orgs).toHaveLength(1);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'object-delete: delete an object',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Obsolete Corp' }));
        yield* AiConversationService.run({
          prompt: `Delete the organization "Obsolete Corp".`,
        });
        expect(Obj.isDeleted(org)).toBe(true);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'object-update: update an object',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Old Name Inc' }));
        yield* AiConversationService.run({
          prompt: `Update the organization "Old Name Inc" and change its name to "New Name Corp".`,
        });
        expect(org.name).toBe('New Name Corp');
      },
      provideTestLayers,
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
        yield* addAssistantBlueprint();
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Acme Corp' }));
        yield* Database.add(Obj.make(Organization.Organization, { name: 'Globex Industries' }));
        const messages = yield* AiConversationService.run({
          prompt: 'Search for all organizations. How many are there?',
        });
        const lastMessage = messages.at(-1);
        expect(lastMessage).toBeDefined();
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'load: load object details',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        const org = yield* Database.add(
          Obj.make(Organization.Organization, { name: 'Detail Corp', description: 'A detailed organization.' }),
        );
        const dxn = Obj.getDXN(org).toString();
        const messages = yield* AiConversationService.run({
          prompt: `Load the full details of object ${dxn}. What is its description?`,
        });
        const lastMessage = messages.at(-1);
        expect(lastMessage).toBeDefined();
      },
      provideTestLayers,
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
        yield* addAssistantBlueprint();
        const person = yield* Database.add(Obj.make(Person.Person, { fullName: 'John Connor' }));
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Cyberdyne Systems' }));
        yield* AiConversationService.run({
          prompt: `Create an Employer relation from person "John Connor" to organization "Cyberdyne Systems" with role "Engineer". List schemas first to find the relation typename.`,
        });
        const relations = yield* Database.runQuery(Query.type(Employer.Employer));
        expect(relations.length).toBeGreaterThanOrEqual(1);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'relation-delete: delete a relation',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
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
        yield* AiConversationService.run({
          prompt: `Delete the relation ${relationDxn}.`,
        });
        expect(Relation.isDeleted(relation)).toBe(true);
      },
      provideTestLayers,
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
        yield* addAssistantBlueprint();
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Tagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'important' }));
        yield* AiConversationService.run({
          prompt: `Add tag "important" to the organization "Tagged Corp".`,
        });
        const tags = Obj.getMeta(org).tags ?? [];
        // TODO(dmaretskyi): matcher doesnt work with echo proxies.
        expect([...tags]).toContain(Obj.getDXN(tag).toString());
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'tag-remove: remove a tag from an object',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Untagged Corp' }));
        const tag = yield* Database.add(Tag.make({ label: 'obsolete' }));
        const tagDxn = Obj.getDXN(tag).toString();
        Entity.change(org, (obj) => Entity.addTag(obj, tagDxn));
        expect(Obj.getMeta(org).tags ?? []).toContain(tagDxn);
        yield* AiConversationService.run({
          prompt: `Remove tag "obsolete" from the organization "Untagged Corp".`,
        });
        const tags = Obj.getMeta(org).tags ?? [];
        // TODO(dmaretskyi): matcher doesnt work with echo proxies.
        expect([...tags]).not.toContain(tagDxn);
      },
      provideTestLayers,
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
        yield* addAssistantBlueprint();
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Context Corp' }));
        yield* AiConversationService.run({
          prompt: `Add the organization "Context Corp" to the chat context.`,
        });
        const conversation = yield* AiConversationService;
        const objects = conversation.context.getObjects();
        expect(objects.length).toBeGreaterThanOrEqual(1);
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );

  it.effect(
    'context-remove: remove object from chat context',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantBlueprint();
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Remove Context Corp' }));
        const { db } = yield* Database.Service;
        const ref = db.makeRef(Obj.getDXN(org)) as Ref.Ref<any>;
        const { binder } = yield* AiContextService;
        yield* Effect.promise(() => binder.bind({ blueprints: [], objects: [ref] }));
        const dxn = Obj.getDXN(org).toString();
        yield* AiConversationService.run({
          prompt: `Remove the organization "Remove Context Corp" from the chat context.`,
        });
        const conversation = yield* AiConversationService;
        const objects = conversation.context.getObjects();
        const found = objects.find((obj) => Obj.getDXN(obj).toString() === dxn);
        expect(found).toBeUndefined();
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
