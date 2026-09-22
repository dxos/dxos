//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { ChatContextHandlers, ChatContextSkill } from '@dxos/assistant-toolkit';
import * as Skill from '@dxos/compute/Skill';
import { Feed } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import * as AssistantSkill from './AssistantSkill.ts';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: ChatContextHandlers,
  types: [Organization.Organization, Skill.Skill, Feed.Feed],
  skills: [AssistantSkill.make(), ChatContextSkill.make()],
  tracing: 'pretty',
});

describe('Assistant Skill', () => {
  // TODO(dmaretskyi): Regenerate memoized conversation with DX_UPDATE_MODEL_FIXTURES=1.
  it.effect.skip(
    'works with Database skill to create objects',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [AssistantSkill.make(), ChatContextSkill.make()],
        });
        yield* agent.submitPrompt('Create a new organization called "Test Corp".');
        yield* agent.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
