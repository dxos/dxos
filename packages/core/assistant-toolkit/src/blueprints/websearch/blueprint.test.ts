//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AgentService } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { TestHelpers } from '@dxos/effect/testing';

import WebSearchBlueprint from './blueprint';
import { WebSearchHandlers } from './functions';
import { WebSearchToolkitGeneric } from './toolkit';

const TestLayer = AssistantTestLayer({
  blueprints: [WebSearchBlueprint.make()],
  operationHandlers: [WebSearchHandlers],
  toolkits: [WebSearchToolkitGeneric],
  tracing: 'pretty',
});

describe('WebToolkit', () => {
  it.effect(
    'WebFetch handler returns response text',
    Effect.fnUntraced(
      function* ({ expect }) {
        const session = yield* AgentService.createSession({
          blueprints: [WebSearchBlueprint.make()],
        });
        yield* session.submitPrompt('What is the capital of France? Make sure to use the web search tool.');
        yield* session.waitForCompletion();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 30_000 },
  );
});
