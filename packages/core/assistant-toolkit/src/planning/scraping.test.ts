import { ObjectId } from '@dxos/keys';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { describe } from 'node:test';
import { it } from '@effect/vitest';
import { Effect } from 'effect';
import { TestHelpers } from '@dxos/effect/testing';
import { AiSession, GenericToolkit } from '@dxos/assistant';
import * as WebToolkit from './WebToolkit';
import { AiService } from '@dxos/ai';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  tracing: 'pretty',
  toolkits: [GenericToolkit.make(WebToolkit.WebToolkit, WebToolkit.layer)],
});

describe('Scraping', () => {
  it.effect(
    'scraping',
    Effect.fnUntraced(
      function* (_) {
        yield* new AiSession()
          .run({
            prompt:
              'find people working on electric sql and companies and people using it. I want a markdown list as the result.',
            toolkit: yield* WebToolkit.WebToolkit.pipe(Effect.provide(WebToolkit.layer)),
          })
          .pipe(Effect.provide(AiService.model('@anthropic/claude-opus-4-6')));
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 600_000 },
  );
});
