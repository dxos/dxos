//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { HasSubject, Organization, Person, ProfileOf } from '@dxos/types';

import { AgentOperationHandlerSet } from '#operations';
import { AgentOperation, Goal, MemoryOperation, Mode } from '#types';

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
    Goal.Goal,
    Mode.Mode,
    Markdown.Document,
    ProfileOf.ProfileOf,
  ],
  disableLlmMemoization: true,
});

/** Reads the rendered cause, since the invoker may rewrap the handler's typed error. */
const failureMessage = (exit: Exit.Exit<unknown, unknown>): string =>
  Exit.isFailure(exit) ? Cause.pretty(exit.cause) : '';

const DISCORD_HANDLE = { label: 'discord', value: '4242' };

/** The agent whose brain holds the facts; Remember records into the space's only agent. */
const addAgent = Operation.invoke(AgentOperation.CreateAgent, { name: 'Interlocutor' });

describe('Interview', () => {
  it.effect(
    'records facts and goals in the order an interview produces them',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* addAgent;
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

        // Remember what was said, as facts.
        const {
          facts: [role, cadence],
        } = yield* Operation.invoke(MemoryOperation.Remember, {
          facts: [
            { subject: first.entity, predicate: 'member of', object: team, quote: 'I lead the Composer team.' },
            { subject: first.entity, predicate: 'prefers', value: 'weekly written updates' },
          ],
        });
        expect(role).not.toBe(cadence);
        yield* Operation.invoke(MemoryOperation.Remember, {
          facts: [
            { subject: first.entity, predicate: 'lives in', value: 'New York', origin: 'inferred', confidence: 0.6 },
          ],
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
          facts: [{ subject: first.entity, predicate: 'prefers', value: 'daily standups', supersedes: [cadence] }],
        });
        yield* Database.flush();

        const recalled = yield* Operation.invoke(MemoryOperation.Recall, { subject: first.entity });
        expect(recalled.facts.map(({ fact }) => fact).sort()).toEqual([
          'Rich Burdon located in New York',
          'Rich Burdon member of Composer team',
          'Rich Burdon prefers daily standups',
        ]);
        expect(recalled.facts.find(({ id }) => id === role)).toMatchObject({
          quote: 'I lead the Composer team.',
          speaker: 'Interlocutor',
        });
        expect(recalled.goals.map(({ title, status }) => ({ title, status }))).toEqual(
          expect.arrayContaining([
            { title: 'Launch autonomous agents', status: 'confirmed' },
            { title: 'Hire two engineers', status: 'proposed' },
          ]),
        );
        expect(recalled.goals).toHaveLength(2);

        const filtered = yield* Operation.invoke(MemoryOperation.Recall, { subject: first.entity, query: 'STANDUPS' });
        expect(filtered.facts.map(({ fact }) => fact)).toEqual(['Rich Burdon prefers daily standups']);

        const teamRecall = yield* Operation.invoke(MemoryOperation.Recall, { subject: team });
        expect(teamRecall.facts.map(({ id }) => id)).toEqual([role]);
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
        expect(text.content).toContain('## Prefers\n\n- daily standups\n');
        expect(text.content).toContain('## Located in\n\n- New York _(inferred)_\n');
        expect(text.content).not.toContain('weekly written updates');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'rejects malformed facts and a goal owned by a non-entity',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* addAgent;
        const empty = yield* Operation.invoke(MemoryOperation.Remember, { facts: [] }).pipe(Effect.exit);
        expect(failureMessage(empty)).toContain('at least one fact');

        const { entity: rich } = yield* Operation.invoke(MemoryOperation.ResolveEntity, { name: 'Rich Burdon' });
        const both = yield* Operation.invoke(MemoryOperation.Remember, {
          facts: [{ subject: rich, predicate: 'knows', object: rich, value: 'Rich' }],
        }).pipe(Effect.exit);
        expect(failureMessage(both)).toContain('exactly one of object');

        const prose = yield* Operation.invoke(MemoryOperation.Remember, {
          facts: [{ subject: rich, predicate: 'claim', value: 'Rich is great.' }],
        }).pipe(Effect.exit);
        expect(failureMessage(prose)).toContain('holds prose');

        const note = yield* Database.add(Text.make({ content: 'Placeholder.' }));
        const invalid = yield* Operation.invoke(MemoryOperation.ProposeGoal, {
          title: 'Invalid',
          horizon: 'now',
          owners: [Ref.make<Obj.Unknown>(note)],
        }).pipe(Effect.exit);
        expect(failureMessage(invalid)).toContain('people or organizations');
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'resolves a nickname, a handle written as a name, or a unique first name to the person already known',
    Effect.fnUntraced(
      function* ({ expect }) {
        const dima = yield* Database.add(
          Person.make({
            fullName: 'Dmytro Maretskyi',
            nickname: 'Dima',
            identities: [{ label: 'discord', value: 'dmaretskyi' }],
          }),
        );
        for (const name of ['Dima', 'dmaretskyi', 'Dmytro', 'dmytro maretskyi']) {
          const resolved = yield* Operation.invoke(MemoryOperation.ResolveEntity, { name });
          expect({ name, created: resolved.created, id: resolved.entity.uri }).toEqual({
            name,
            created: false,
            id: Ref.make(dima).uri,
          });
        }

        // A first name two people share names neither.
        yield* Database.add(Person.make({ fullName: 'Dmytro Kovalenko' }));
        expect((yield* Operation.invoke(MemoryOperation.ResolveEntity, { name: 'Dmytro' })).created).toBe(true);

        // A full name outranks someone else's nickname.
        const otherDima = yield* Database.add(Person.make({ fullName: 'Dima' }));
        expect((yield* Operation.invoke(MemoryOperation.ResolveEntity, { name: 'Dima' })).entity.uri).toBe(
          Ref.make(otherDima).uri,
        );
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'recall matches every word of a query, and returns everything about the subject when it matches nothing',
    Effect.fnUntraced(
      function* ({ expect }) {
        yield* addAgent;
        const { entity: rich } = yield* Operation.invoke(MemoryOperation.ResolveEntity, { name: 'Rich Burdon' });
        yield* Operation.invoke(MemoryOperation.Remember, {
          facts: [{ subject: rich, predicate: 'located in', value: 'New York', quote: 'I am based in New York.' }],
        });
        yield* Database.flush();

        const words = yield* Operation.invoke(MemoryOperation.Recall, { subject: rich, query: 'york based' });
        expect(words.queryMatched).toBeUndefined();
        expect(words.facts.map(({ fact }) => fact)).toEqual(['Rich Burdon located in New York']);

        // Words split the same way on both sides, and a query word may start a longer word but not sit inside one.
        for (const query of ['new-york', 'NEW YORK', 'bas']) {
          expect(
            (yield* Operation.invoke(MemoryOperation.Recall, { subject: rich, query })).queryMatched,
          ).toBeUndefined();
        }
        expect((yield* Operation.invoke(MemoryOperation.Recall, { subject: rich, query: 'ork' })).queryMatched).toBe(
          false,
        );

        const fallback = yield* Operation.invoke(MemoryOperation.Recall, { subject: rich, query: 'location' });
        expect(fallback.queryMatched).toBe(false);
        expect(fallback.facts.map(({ fact }) => fact)).toEqual(['Rich Burdon located in New York']);

        // Models pass numbers as strings; the call still succeeds.
        const limited = yield* Operation.invoke(MemoryOperation.Recall, {
          subject: rich,
          limit: Schema.decodeUnknownSync(MemoryOperation.Recall.input)({ limit: '1' }).limit,
        });
        expect(limited.facts).toHaveLength(1);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
