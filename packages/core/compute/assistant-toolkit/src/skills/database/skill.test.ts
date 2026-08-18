//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Obj, Tag } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { DXN, EntityId } from '@dxos/keys';
import { Employer, Organization, Person } from '@dxos/types';

import { DatabaseHandlers } from './operations';
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

describe('Database Skill', { tags: ['model-fixture'] }, () => {
  //
  // Schema
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
