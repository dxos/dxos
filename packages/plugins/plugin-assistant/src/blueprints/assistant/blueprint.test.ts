//
// Copyright 2025 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiContextService, AiConversationService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { DatabaseBlueprint } from '@dxos/assistant-toolkit';
import { Blueprint } from '@dxos/blueprints';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import { Organization } from '@dxos/types';

import AssistantBlueprint from './blueprint';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  functions: [...Object.values(DatabaseBlueprint.functions)],
  types: [Organization.Organization, Blueprint.Blueprint],
  tracing: 'pretty',
});

const provideTestLayers = Effect.provide(AiConversationService.layerNewQueue().pipe(Layer.provideMerge(TestLayer)));

const addAssistantAndDatabaseBlueprints = Effect.fnUntraced(function* () {
  yield* AiContextService.bindContext({
    blueprints: [
      Ref.make(yield* Database.add(Obj.clone(AssistantBlueprint.make(), { deep: true }))),
      Ref.make(yield* Database.add(Obj.clone(DatabaseBlueprint.make(), { deep: true }))),
    ],
  });
});

describe('Assistant Blueprint', () => {
  // TODO(dmaretskyi): Regenerate memoized conversation with ALLOW_LLM_GENERATION=1.
  it.effect.skip(
    'works with Database blueprint to create objects',
    Effect.fnUntraced(
      function* (_) {
        yield* addAssistantAndDatabaseBlueprints();
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
