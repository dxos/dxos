//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import { AssistantTestLayer } from '@dxos/agent-runtime/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Database, DXN, Obj, Type } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { EntityId } from '@dxos/keys';

import { AssistantOperationHandlerSet } from '#operations';
import { AssistantCapabilities, AssistantOperation } from '#types';

EntityId.dangerouslyDisableRandomness();

const HOUR_MS = 60 * 60 * 1000;

class TestNote extends Type.makeObject<TestNote>(DXN.make('com.example.type.note', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(Annotation.UserType.set()),
) {}

/** Adds `count` notes and returns the fingerprint the handler derives from them. */
const addNotes = (count: number) =>
  Effect.gen(function* () {
    const notes = yield* Effect.forEach(Array.from({ length: count }), (_, index) =>
      Database.add(Obj.make(TestNote, { name: `Note ${index}` })),
    );
    // The handler reads the recent objects through a query, which only sees indexed objects.
    yield* Database.flush({ indexes: true });
    return notes
      .map((note) => `${Obj.getTypename(note)}:${Obj.getLabel(note)}`)
      .sort()
      .join('\n');
  });

// Shared registry and cache atom — each test sets its own cache state before invoking the operation.
const testRegistry = Registry.make();
const testCacheAtom = Atom.make<AssistantCapabilities.HomeSuggestionsCache>({}).pipe(Atom.keepAlive);
const testManager = CapabilityManager.make({ registry: testRegistry });
testManager.contribute({ module: 'test', interface: Capabilities.AtomRegistry, implementation: testRegistry });
testManager.contribute({ module: 'test', interface: AppCapabilities.Schema, implementation: [TestNote] });
testManager.contribute({
  module: 'test',
  interface: AssistantCapabilities.HomeSuggestionsCache,
  implementation: testCacheAtom,
});

const TestLayer = AssistantTestLayer({
  operationHandlers: AssistantOperationHandlerSet,
  types: [TestNote],
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

        const result = yield* Operation.invoke(AssistantOperation.GenerateHomeSuggestions, {});

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
    'fewer recent objects than the minimum use the fallback without generating',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        testRegistry.set(testCacheAtom, {});
        yield* addNotes(4);

        const result = yield* Operation.invoke(AssistantOperation.GenerateHomeSuggestions, {});

        expect(result.prompts).toHaveLength(0);
        expect(testRegistry.get(testCacheAtom)[db.spaceId]).toBeUndefined();
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'an unchanged set of recent objects reuses cached prompts past the refresh interval',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        const fingerprint = yield* addNotes(5);
        const stored = ['Refine the proposal', 'Review the schedule', 'Draft a summary'];
        testRegistry.set(testCacheAtom, {
          [db.spaceId]: { generatedAt: Date.now() - 2 * HOUR_MS, prompts: stored, fingerprint },
        });

        const result = yield* Operation.invoke(AssistantOperation.GenerateHomeSuggestions, {});

        expect(result.prompts).toEqual(stored);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'a changed set reuses cached prompts within the refresh interval',
    Effect.fnUntraced(
      function* (_) {
        const { db } = yield* Database.Service;
        yield* addNotes(5);
        const stored = ['Refine the proposal', 'Review the schedule', 'Draft a summary'];
        testRegistry.set(testCacheAtom, {
          [db.spaceId]: { generatedAt: Date.now() - HOUR_MS / 2, prompts: stored, fingerprint: 'another set' },
        });

        const result = yield* Operation.invoke(AssistantOperation.GenerateHomeSuggestions, {});

        expect(result.prompts).toEqual(stored);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
