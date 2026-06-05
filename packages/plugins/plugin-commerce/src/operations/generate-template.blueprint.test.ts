//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

import { Blueprint } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AgentService } from '@dxos/functions-runtime';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { EntityId } from '@dxos/keys';

import { ProviderBlueprint } from '../blueprints';
import { SearchOperationHandlerSet } from '../operations';
import { Provider } from '../types';
import { extractResults } from '../util';

// Cleaned capture of a real AutoTrader UK results page (raw save is gitignored). The mocked edge
// proxy returns this for AnalyzeProvider's fetch, so the agent reasons over genuine markup with no
// network. cleanHtml already stripped scripts/styles, so it stands in for AnalyzeProvider's output.
const SAMPLE = readFileSync(
  fileURLToPath(new URL('../testing/fixtures/autotrader-results.sample.html', import.meta.url)),
  'utf8',
);

// Route the engine's outbound fetch to the fixture (no live AutoTrader / anti-bot in tests).
vi.mock('@dxos/edge-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@dxos/edge-client')>()),
  proxyFetchLegacy: vi.fn(async () => new Response(SAMPLE, { status: 200, headers: { 'content-type': 'text/html' } })),
}));

EntityId.dangerouslyDisableRandomness();

const TestLayer = AssistantTestLayer({
  operationHandlers: SearchOperationHandlerSet,
  types: [Provider.Provider, Blueprint.Blueprint],
  blueprints: [ProviderBlueprint.make()],
  aiServicePreset: 'edge-remote',
});

describe('provider blueprint: generate a parser from a real page', () => {
  it.effect(
    'the LLM authors a working search template for AutoTrader',
    Effect.fnUntraced(
      function* (_) {
        const provider = yield* Database.add(
          Provider.make({
            name: 'AutoTrader UK',
            url: 'https://www.autotrader.co.uk/cars/used',
            kind: 'scrape',
          }),
        );
        yield* Database.flush();

        const agent = yield* AgentService.createSession({
          blueprints: [ProviderBlueprint.make()],
          context: [Ref.make(provider)],
        });
        yield* agent.submitPrompt(
          'Analyze the AutoTrader provider in your context and generate and persist its search ' +
            'template (search schema, request mapping, result mapping) by calling analyzeProvider ' +
            'then setProviderTemplate.',
        );
        yield* agent.waitForCompletion();

        const updated = yield* Database.load(Ref.make(provider));

        // The LLM authored all three parts of the template.
        expect(updated.request, 'request mapping').toBeDefined();
        expect(updated.result, 'result mapping').toBeDefined();
        expect(updated.searchSchema, 'search schema').toBeDefined();
        expect(Object.keys(updated.searchSchema?.properties ?? {}).length).toBeGreaterThan(0);

        // The generated result mapping, applied back to the real page, extracts listings.
        const results = extractResults(SAMPLE, updated.result!);
        expect(results.filter((result) => result.title.length > 0).length).toBeGreaterThanOrEqual(5);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 240_000, tags: ['llm'] },
  );
});
