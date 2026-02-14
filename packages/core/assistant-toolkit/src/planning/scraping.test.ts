//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Toolkit from '@effect/ai/Toolkit';

import { AiService } from '@dxos/ai';
import { AiSession, GenericToolkit } from '@dxos/assistant';
import { AssistantTestLayer } from '@dxos/assistant/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { ObjectId } from '@dxos/keys';
import * as Layer from 'effect/Layer';
import { trim } from '@dxos/util';

import * as PlanningToolkit from './PlanningToolkit';
import * as WebToolkit from './WebToolkit';

ObjectId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  aiServicePreset: 'edge-remote',
  tracing: 'pretty',
});

describe('Scraping', () => {
  it.effect(
    'scraping',
    Effect.fnUntraced(
      function* (_) {
        yield* new AiSession()
          .run({
            system: SYSTEM,
            prompt:
              'find people working on electric sql and companies and people using it. I want a markdown list as the result. Research each person: company, role, email, phone number, and website, github.',
            toolkit: yield* Toolkit.merge(WebToolkit.WebToolkit, PlanningToolkit.PlanningToolkit),
          })
          .pipe(Effect.provide(AiService.model('@anthropic/claude-opus-4-6')));
      },
      Effect.provide(Layer.mergeAll(TestLayer, WebToolkit.layer, PlanningToolkit.layer)),
      TestHelpers.provideTestContext,
    ),
    { timeout: 600_000 },
  );
});

const SYSTEM = trim`
  You are a helpful assistant with access to planing mode.
  Keep the user updated on the progress by creating and updating tasks. 
`;
