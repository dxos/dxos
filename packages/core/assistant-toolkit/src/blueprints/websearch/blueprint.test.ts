//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { AssistantTestLayer } from '@dxos/assistant/testing';

import { TestHelpers } from '@dxos/effect/testing';

import { AgentService } from '@dxos/assistant';
import WebSearchBlueprint from './blueprint';
import { WebSearchToolkitGeneric } from './toolkit';
import { WebSearchHandlers } from './functions';

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
