//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { DatabaseBlueprint, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { Blueprint } from '@dxos/blueprints';
import { Feed } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import AssistantBlueprint from './blueprint';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Blueprint.Blueprint, Feed.Feed],
  blueprints: [AssistantBlueprint.make(), DatabaseBlueprint.make()],
  tracing: 'pretty',
});

describe('Assistant Blueprint', () => {
  // TODO(dmaretskyi): Regenerate memoized conversation with ALLOW_LLM_GENERATION=1.
  it.effect.skip(
    'works with Database blueprint to create objects',
    Effect.fnUntraced(
      function* (_) {
        const agent = yield* AgentService.createSession({
          blueprints: [AssistantBlueprint.make(), DatabaseBlueprint.make()],
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
