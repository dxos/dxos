//
// Copyright 2026 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import { Capabilities, Capability, CapabilityManager } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { AssistantCapabilities, AssistantOperation } from '#types';

import { AssistantOperationHandlerSet } from './index';

EntityId.dangerouslyDisableRandomness();

const CACHE_TTL_MS = 60 * 60 * 1000;

// Shared registry and cache atom — each test sets its own cache state before invoking the operation.
const testRegistry = Registry.make();
const testCacheAtom = Atom.make<AssistantCapabilities.HomeSuggestionsCache>({}).pipe(Atom.keepAlive);
const testManager = CapabilityManager.make({ registry: testRegistry });
testManager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: testRegistry });
testManager.contribute({
  module: 'test',
  interface: AssistantCapabilities.HomeSuggestionsCache,
  implementation: testCacheAtom,
});

const TestLayer = AssistantTestLayer({
  operationHandlers: AssistantOperationHandlerSet,
  // Provide Capability.Service so the handler can read/write the suggestions cache.
  extraServices: Layer.succeed(Capability.Service, testManager),
});

describe('GenerateHomeSuggestions', () => {
  it.effect(
    'empty space returns empty prompts (fallback path)',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        testRegistry.set(testCacheAtom, {});

        const result = yield* Operation.invoke(AssistantOperation.GenerateHomeSuggestions, { db });

        expect(result.prompts).toHaveLength(0);
        // No cache entry written when prompts is empty.
        const cached = testRegistry.get(testCacheAtom);
        expect(cached[db.spaceId]).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'cache hit returns stored prompts without re-generating',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const stored = ['Refine the proposal', 'Review the schedule', 'Draft a summary'];
        testRegistry.set(testCacheAtom, {
          [db.spaceId]: { generatedAt: Date.now(), prompts: stored },
        });

        const result = yield* Operation.invoke(AssistantOperation.GenerateHomeSuggestions, { db });

        expect(result.prompts).toEqual(stored);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'expired cache entry is not used — re-runs and returns empty for empty space',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const stale = ['Stale prompt A', 'Stale prompt B', 'Stale prompt C'];
        testRegistry.set(testCacheAtom, {
          [db.spaceId]: { generatedAt: Date.now() - 2 * CACHE_TTL_MS, prompts: stale },
        });

        // Empty space — expired entry is ignored, no LLM call, no new cache entry written.
        const result = yield* Operation.invoke(AssistantOperation.GenerateHomeSuggestions, { db });

        expect(result.prompts).toHaveLength(0);
        // Cache not updated since prompts is empty.
        const cached = testRegistry.get(testCacheAtom);
        expect(cached[db.spaceId]?.prompts).toEqual(stale);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
