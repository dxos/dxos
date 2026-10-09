//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Query, Relation } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { HasSubject, Organization, Person, ProfileOf } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { Goal, Memory, MemoryOperation } from '#types';

import { makeTestBrain } from '../brain/testing.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  // Recall reads facts from the agents' brains.
  extraServices: makeTestBrain().layer,
  operationHandlers: AgentOperationHandlerSet,
  types: [
    Agent.Agent,
    Chat.Chat,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Person.Person,
    Organization.Organization,
    HasSubject.HasSubject,
    Memory.Memory,
    Goal.Goal,
    Markdown.Document,
    ProfileOf.ProfileOf,
  ],
  disableLlmMemoization: true,
});

/** Reads the rendered cause, since the invoker may rewrap the handler's typed error. */
const failureMessage = (exit: Exit.Exit<unknown, unknown>): string =>
  Exit.isFailure(exit) ? Cause.pretty(exit.cause) : '';

const DISCORD_HANDLE = { label: 'discord', value: '4242' };

describe('Interview', () => {
  it.effect(
    'records memories and goals in the order an interview produces them',
    Effect.fnUntraced(
      function* ({ expect }) {
        // Identify the person being interviewed.
        const first = yield* Operation.invoke(MemoryOperation.ResolveEntity, {
          name: 'Rich Burdon',
          handles: [DISCORD_HANDLE],
        });
        expect(first.created).toBe(true);
        yield* Database.flush();

        const again = yield* Operation.invoke(MemoryOperation.ResolveEntity, { handles: [DISCORD_HANDLE] });
        expect(again.created).toBe(false);
        expect(again.entity.uri).toBe(first.entity.uri);

        const byName = yield* Operation.invoke(MemoryOperation.ResolveEntity, { name: 'rich burdon' });
        expect(byName.created).toBe(false);

        const rich = yield* Database.load(first.entity);
        expect(Obj.instanceOf(Person.Person, rich)).toBe(true);

        const { entity: team } = yield* Operation.invoke(MemoryOperation.ResolveEntity, {
          name: 'Composer team',
          kind: 'organization',
        });

        // Remember what was said.
        const { memory: role } = yield* Operation.invoke(MemoryOperation.Remember, {
          content: 'Rich leads the Composer team.',
          kind: 'relationship',
          subjects: [first.entity, team],
        });
        const { memory: cadence } = yield* Operation.invoke(MemoryOperation.Remember, {
          content: 'Rich prefers weekly written updates.',
          kind: 'preference',
          subjects: [first.entity],
        });
        yield* Operation.invoke(MemoryOperation.Remember, {
          content: 'Rich is based in New York.',
          kind: 'fact',
          origin: 'inferred',
          confidence: 0.6,
          subjects: [first.entity],
        });

        // Goals are proposed, then one is confirmed.
        const { goal: launch } = yield* Operation.invoke(MemoryOperation.ProposeGoal, {
          title: 'Launch autonomous agents',
          description: 'Agents that interview people and remember what they learn.',
          horizon: 'quarter',
          owners: [first.entity],
        });
        yield* Operation.invoke(MemoryOperation.ProposeGoal, {
          title: 'Hire two engineers',
          horizon: 'year',
          owners: [first.entity],
        });
        yield* Operation.invoke(MemoryOperation.ConfirmGoal, { goal: launch });
        expect((yield* Database.load(launch)).status).toBe('confirmed');

        // A contradiction supersedes rather than overwrites.
        yield* Operation.invoke(MemoryOperation.Remember, {
          content: 'Rich prefers daily standups over written updates.',
          kind: 'preference',
          subjects: [first.entity],
          supersedes: cadence,
        });
        expect((yield* Database.load(cadence)).status).toBe('superseded');
        yield* Database.flush();

        const recalled = yield* Operation.invoke(MemoryOperation.Recall, { subject: first.entity });
        expect(recalled.memories.map(({ content }) => content).sort()).toEqual([
          'Rich is based in New York.',
          'Rich leads the Composer team.',
          'Rich prefers daily standups over written updates.',
        ]);
        expect(recalled.goals.map(({ title, status }) => ({ title, status }))).toEqual(
          expect.arrayContaining([
            { title: 'Launch autonomous agents', status: 'confirmed' },
            { title: 'Hire two engineers', status: 'proposed' },
          ]),
        );
        expect(recalled.goals).toHaveLength(2);

        const filtered = yield* Operation.invoke(MemoryOperation.Recall, { subject: first.entity, query: 'STANDUPS' });
        expect(filtered.memories.map(({ content }) => content)).toEqual([
          'Rich prefers daily standups over written updates.',
        ]);

        const teamRecall = yield* Operation.invoke(MemoryOperation.Recall, { subject: team });
        expect(teamRecall.memories.map(({ memory }) => memory.uri)).toEqual([role.uri]);
        expect(teamRecall.goals).toHaveLength(0);

        // The profile is regenerated in place.
        const { document: firstProfile } = yield* Operation.invoke(MemoryOperation.UpdateProfile, {
          subject: first.entity,
        });
        yield* Database.flush();
        const { document: secondProfile } = yield* Operation.invoke(MemoryOperation.UpdateProfile, {
          subject: first.entity,
        });
        expect(secondProfile.uri).toBe(firstProfile.uri);

        const relations = yield* Database.query(Query.select(Filter.id(rich.id)).targetOf(ProfileOf.ProfileOf)).run;
        expect(relations).toHaveLength(1);
        const document = Relation.getSource(relations[0]);
        expect(Obj.instanceOf(Markdown.Document, document)).toBe(true);
        if (!Obj.instanceOf(Markdown.Document, document)) {
          return;
        }

        const text = yield* Database.load(document.content);
        expect(text.content).toContain('# Rich Burdon');
        expect(text.content).toContain('Launch autonomous agents');
        expect(text.content).toContain('Rich prefers daily standups over written updates.');
        expect(text.content).not.toContain('Rich prefers weekly written updates.');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'rejects a memory without subjects and a goal owned by a non-entity',
    Effect.fnUntraced(
      function* ({ expect }) {
        const empty = yield* Operation.invoke(MemoryOperation.Remember, {
          content: 'Nobody in particular.',
          kind: 'fact',
          subjects: [],
        }).pipe(Effect.exit);
        expect(failureMessage(empty)).toContain('at least one subject');

        const { memory } = yield* Operation.invoke(MemoryOperation.Remember, {
          content: 'Placeholder.',
          kind: 'fact',
          subjects: [(yield* Operation.invoke(MemoryOperation.ResolveEntity, { name: 'Alice' })).entity],
        });
        const invalid = yield* Operation.invoke(MemoryOperation.ProposeGoal, {
          title: 'Invalid',
          horizon: 'now',
          owners: [memory],
        }).pipe(Effect.exit);
        expect(failureMessage(invalid)).toContain('people or organizations');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
