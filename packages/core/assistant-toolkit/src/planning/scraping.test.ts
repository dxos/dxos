//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { AiService } from '@dxos/ai';
import { AiSession, GenericToolkit } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';

import * as WebToolkit from './WebToolkit';

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
