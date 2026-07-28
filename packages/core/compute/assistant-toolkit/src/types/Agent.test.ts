//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Instructions, Operation, Project, Routine, Skill, Trigger } from '@dxos/compute';
import { Collection, Database, Feed, Filter, Obj, Ref, Relation, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { agentMigration } from '../migrations';
import artifactList from '../skills/project/operations/artifact-list';
import { Agent, Chat, Plan } from '../types';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [
    Agent.Agent,
    Agent.LegacyAgent,
    Plan.Plan,
    Chat.Chat,
    Chat.CompanionTo,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
    Project.Project,
    Collection.Collection,
    Routine.Routine,
    Trigger.Trigger,
  ],
  disableLlmMemoization: true,
});

describe('Agent (0.2.0)', () => {
  it.scoped(
    'makeInitialized creates the identity/preset shape',
    Effect.fnUntraced(
      function* ({ expect }) {
        const agent = yield* Agent.makeInitialized(
          { name: 'Test', instructions: 'Do the thing.' },
          Skill.make({ key: 'org.dxos.test.skill', name: 'Test' }),
        );
        yield* Database.flush();

        expect(Type.getVersion(Agent.Agent)).toBe('0.2.0');
        const { text, instructions } = yield* Agent.loadInstructions(agent);
        expect(text).toBe('Do the thing.');
        expect(Obj.getParent(instructions)).toBe(agent);

        // The chat carries the inverted linkage; the agent owns no conversation state.
        const chat = yield* Agent.loadChat(agent);
        expect(chat).toBeDefined();
        expect(chat?.agent?.uri).toBe(Ref.make(agent).uri);
        expect(chat?.instructions?.uri).toBe(agent.instructions.uri);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.scoped(
    'migrates a 0.1.0 agent: typed instructions, artifacts to a project, chat inversion',
    Effect.fnUntraced(function* ({ expect }) {
      const builder = yield* Effect.acquireRelease(
        Effect.promise(() => new EchoTestBuilder().open()),
        (builder) => Effect.promise(() => builder.close()),
      );
      const { db, graph } = yield* Effect.promise(() => builder.createDatabase());
      graph.registry.add([
        Agent.LegacyAgent,
        Agent.Agent,
        Chat.Chat,
        Chat.CompanionTo,
        Instructions.Instructions,
        Project.Project,
        Collection.Collection,
        Routine.Routine,
        Trigger.Trigger,
        Operation.PersistentOperation,
        Text.Text,
        Feed.Feed,
      ]);

      yield* Effect.gen(function* () {
        // A pre-reconciliation agent: bare-Text instructions, inline artifacts, owned chat, cron.
        const doc = yield* Database.add(Text.make({ content: 'artifact body' }));
        const instructionsText = yield* Database.add(Text.make({ content: 'Legacy steering.' }));
        const feed = yield* Database.add(Feed.make());
        const chat = yield* Database.add(Chat.make({ name: 'Legacy chat', feed: Ref.make(feed) }));
        const legacy = yield* Database.add(
          Obj.make(Agent.LegacyAgent, {
            name: 'Legacy',
            instructions: Ref.make(instructionsText),
            chat: Ref.make(chat),
            artifacts: [{ name: 'Doc', data: Ref.make(doc) }],
            subscriptions: [],
            cron: '0 9 * * *',
          }),
        );
        yield* Database.add(
          Relation.make(Chat.CompanionTo, {
            [Relation.Source]: chat,
            [Relation.Target]: legacy,
          }),
        );
        yield* Database.flush();

        yield* Effect.promise(() => db.runMigrations([agentMigration]));

        const [agent] = yield* Database.query(Filter.type(Agent.Agent)).run;
        expect(agent).toBeDefined();
        expect(agent.name).toBe('Legacy');

        // Bare Text wrapped into a typed Instructions.
        const { text } = yield* Agent.loadInstructions(agent);
        expect(text).toBe('Legacy steering.');

        // Inline artifacts land in a Project's collection, listable via the project skill.
        const [project] = yield* Database.query(Filter.type(Project.Project)).run;
        expect(project?.name).toBe('Legacy');
        const { artifacts } = yield* artifactList.handler({ project: Ref.make(project) });
        expect(artifacts).toHaveLength(1);
        expect(artifacts[0].dxn).toBe(Obj.getURI(doc));

        // Chat inversion: chat.agent + chat.instructions set; feed still resolves.
        const migratedChat = yield* Agent.loadChat(agent);
        expect(migratedChat?.agent?.uri).toBe(Ref.make(agent).uri);
        expect(migratedChat?.instructions?.uri).toBe(agent.instructions.uri);
        expect(migratedChat?.feed?.target?.id).toBe(feed.id);

        // Legacy cron replayed into a relay routine.
        const routines = yield* Database.query(Filter.type(Routine.Routine)).run;
        expect(routines).toHaveLength(1);
      }).pipe(Effect.provide(Database.layer(db)));
    }),
  );
});
