//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { DatabaseBlueprint, DatabaseHandlers } from '@dxos/assistant-toolkit';
import { addBlueprints } from '@dxos/assistant-toolkit/testing';
import { Blueprint } from '@dxos/blueprints';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import AssistantBlueprint from './blueprint';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: DatabaseHandlers,
  types: [Organization.Organization, Blueprint.Blueprint],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer)));

describe('Assistant Blueprint', () => {
  // TODO(dmaretskyi): Regenerate memoized conversation with ALLOW_LLM_GENERATION=1.
  it.effect.skip(
    'works with Database blueprint to create objects',
    Effect.fnUntraced(
      function* (_) {
        yield* addBlueprints([AssistantBlueprint, DatabaseBlueprint]);
        const messages = yield* AiConversationService.run({
          prompt: 'Create a new organization called "Test Corp".',
        });
        const lastMessage = messages.at(-1);
        expect(lastMessage).toBeDefined();
      },
      provideTestLayers,
      TestHelpers.provideTestContext,
    ),
    { timeout: 60_000 },
  );
});
