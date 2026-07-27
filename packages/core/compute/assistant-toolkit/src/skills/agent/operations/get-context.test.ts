//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { AiContext } from '@dxos/assistant';
import { Operation, OperationHandlerSet, Skill } from '@dxos/compute';
import { Collection, Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { invariant } from '@dxos/invariant';
import { EntityId } from '@dxos/keys';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/plugin';
import { Text } from '@dxos/schema';

import { Agent, Chat, Plan } from '../../../types';
import AgentSkillDef from '../skill';
import * as AgentSkillOperations from './definitions';
import { AgentSkillHandlers } from './index';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.merge(AgentSkillHandlers, MarkdownOperationHandlerSet),
  types: [
    Agent.Agent,
    Plan.Plan,
    Chat.Chat,
    Chat.CompanionTo,
    Skill.Skill,
    Text.Text,
    Markdown.Document,
    Collection.Collection,
  ],
  disableLlmMemoization: true,
});

describe('GetContext', () => {
  it.scoped(
    'get-context: reports the bound agent name, instructions and artifacts',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { agent, conversation } = yield* setupBoundAgent();
        const document = yield* Database.add(
          Obj.make(Markdown.Document, {
            name: 'Test Document',
            content: Ref.make(Text.make({ content: 'Body.' })),
          }),
        );
        yield* Database.flush();
        yield* Operation.invoke(AgentSkillOperations.AddArtifact, {
          name: 'My Test Document',
          artifact: document.id,
        }).pipe(Effect.provide(conversation));

        const context = yield* Operation.invoke(AgentSkillOperations.GetContext, {}).pipe(Effect.provide(conversation));

        expect(context.id).toBe(agent.id);
        expect(context.name).toBe('Test Agent');
        expect(context.instructions).toBe('A test agent for adding artifacts.');
        expect(context.artifacts).toEqual([
          { name: 'My Test Document', type: Obj.getTypename(document), dxn: Obj.getURI(document) },
        ]);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});

// Creates an agent and binds it to its own chat feed so the harness-scoped operations resolve it.
const setupBoundAgent = Effect.fnUntraced(function* () {
  const agent = yield* Agent.makeInitialized(
    { name: 'Test Agent', instructions: 'A test agent for adding artifacts.' },
    AgentSkillDef.make(),
  );
  yield* Database.flush();

  const chatFeed = agent.chat?.target?.feed?.target;
  invariant(chatFeed, 'Agent chat feed not found.');
  const runtime = yield* Effect.runtime<Database.Service>();
  const binder = new AiContext.Binder({ feed: chatFeed, runtime });
  yield* Effect.promise(() => binder.bind({ objects: [Ref.make(agent)] }));

  return { agent, conversation: Operation.withInvocationOptions({ conversation: Obj.getURI(chatFeed) }) };
});
