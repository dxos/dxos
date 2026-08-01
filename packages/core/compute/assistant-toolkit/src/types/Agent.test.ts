//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Instructions, Plan, Skill } from '@dxos/compute';
import { Database, Feed, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { Agent, Chat } from '../types';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  types: [
    Agent.Agent,
    Plan.Plan,
    Chat.Chat,
    Chat.CompanionTo,
    Skill.Skill,
    Feed.Feed,
    Text.Text,
    Instructions.Instructions,
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

        // The relation carries the linkage in both directions; the agent owns no conversation state.
        const chat = yield* Agent.loadChat(agent);
        expect(chat).toBeDefined();
        expect(chat?.instructions?.uri).toBe(agent.instructions.uri);

        // Compare by id: the two query paths may resolve distinct proxy instances.
        const linkedAgent = chat ? yield* Agent.loadForChat(chat) : undefined;
        expect(linkedAgent?.id).toBe(agent.id);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
