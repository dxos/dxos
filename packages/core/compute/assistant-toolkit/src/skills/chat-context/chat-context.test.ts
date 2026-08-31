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

import { ChatContextHandlers } from './operations';
import ChatContextSkill from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: ChatContextHandlers,
  types: [Organization.Organization, Person.Person, Employer.Employer, Tag.Tag, Skill.Skill, Feed.Feed],
  skills: [ChatContextSkill.make()],
  tracing: 'pretty',
  model: DXN.make('com.anthropic.model.claude-sonnet-5.default'),
  aiServicePreset: 'direct',
});

describe('Chat Context Skill', { tags: ['model-fixture'] }, () => {
  it.effect(
    'context-add: add object to chat context',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [ChatContextSkill.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Context Corp' }));
        // The skill binds and unbinds context only; resolving a name to a URI is the Database
        // skill's job, so the prompt supplies the URI directly.
        yield* agent.submitPrompt(`Add the object ${Obj.getURI(org)} to the chat context.`);
        yield* agent.waitForCompletion();
        const contextRefs = yield* agent.getContext();
        // Context refs come back space-relative (`echo:///<id>`), so identity is the object id.
        expect(contextRefs.map((each) => each.uri.split('/').at(-1))).toContain(org.id);
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
          skills: [ChatContextSkill.make()],
        });
        const org = yield* Database.add(Obj.make(Organization.Organization, { name: 'Remove Context Corp' }));
        const { db } = yield* Database.Service;
        const ref = db.makeRef<Organization.Organization>(Obj.getURI(org));
        yield* agent.addContext([ref]);
        const uri = Obj.getURI(org);
        // Context refs come back space-relative (`echo:///<id>`) while `getURI` is space-qualified,
        // so identity is compared on the object id.
        const contextIds = () =>
          agent.getContext().pipe(Effect.map((refs) => refs.map((each) => each.uri.split('/').at(-1))));
        // Absence alone would also hold if the tool never ran, so pin the starting state.
        expect(yield* contextIds()).toContain(org.id);
        yield* agent.submitPrompt(`Remove the object ${uri} from the chat context.`);
        yield* agent.waitForCompletion();
        expect(yield* contextIds()).not.toContain(org.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
