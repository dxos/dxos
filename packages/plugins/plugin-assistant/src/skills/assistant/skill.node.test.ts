//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { DatabaseHandlers, DatabaseSkill } from '@dxos/assistant-toolkit';
import { Skill } from '@dxos/compute';
import { Feed } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/agent-runtime';
import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { EntityId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import AssistantSkill from './skill';

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Skill.Skill, Feed.Feed],
  skills: [AssistantSkill.make(), DatabaseSkill.make()],
  tracing: 'pretty',
});

describe('Assistant Skill', () => {
  // TODO(dmaretskyi): Regenerate memoized conversation with ALLOW_LLM_GENERATION=1.
  it.effect.skip(
    'works with Database skill to create objects',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          skills: [AssistantSkill.make(), DatabaseSkill.make()],
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
