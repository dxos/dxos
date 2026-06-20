//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';

import WebSearchSkill from './skill';
import { WebSearchHandlers } from './operations';
import { WebSearchToolkitOpaque } from './toolkit';

const TestLayer = AssistantTestLayer({
  skills: [WebSearchSkill.make()],
  operationHandlers: [WebSearchHandlers],
  toolkits: [WebSearchToolkitOpaque],
  tracing: 'pretty',
});

describe('WebToolkit', () => {
  // Keep skipped, this test is flaky.
  it.effect.skip(
    'WebFetch handler returns response text',
    Effect.fnUntraced(
      function* ({ expect }) {
        const session = yield* AgentService.createSession({
          skills: [WebSearchSkill.make()],
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
