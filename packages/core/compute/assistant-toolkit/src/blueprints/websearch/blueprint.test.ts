//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { vi } from 'vitest';

import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';

const _realFetch = globalThis.fetch;

// Return fixed HTML so memoized conversations are stable across runs.
vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
  if (typeof url === 'string' && !url.includes('anthropic.com') && !url.includes('dxos.network')) {
    return {
      text: async () =>
        '<html><body><h1>France</h1><p>The capital of France is Paris.</p></body></html>',
    } as unknown as Response;
  }
  return _realFetch(url, init);
});

import WebSearchBlueprint from './blueprint';
import { WebSearchHandlers } from './operations';
import { WebSearchToolkitOpaque } from './toolkit';

const TestLayer = AssistantTestLayer({
  blueprints: [WebSearchBlueprint.make()],
  operationHandlers: [WebSearchHandlers],
  toolkits: [WebSearchToolkitOpaque],
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
