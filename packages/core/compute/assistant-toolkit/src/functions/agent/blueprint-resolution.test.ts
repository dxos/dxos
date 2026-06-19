//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Blueprint, Routine } from '@dxos/compute';
import { Database, Feed, Ref } from '@dxos/echo';
import { TestHelpers } from '@dxos/effect/testing';
import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { Text } from '@dxos/schema';

import { WebSearchBlueprint } from '../../blueprints';

// Regression coverage for the CRM-routine failure: blueprints live only in the registry
// (referenced via `Ref.fromURI(Blueprint.registryURI(key))`), never forked into the space DB.
//
// `AiContext.Binder.bind` persists each bound blueprint ref to the conversation feed. A later
// turn (or spawned process) re-reads that ref with an empty in-memory cache and must resolve it
// on its own. If the routine's registry blueprint is bound by its registry DXN ref, resolution
// stays in the registry and succeeds. If it is re-wrapped with `Ref.make` first (minting an
// EID ref to an object that only exists in the registry, never in the DB), the persisted ref
// dangles — in production the DB query blocks for its full 30s timeout; with a fresh binder here
// it simply resolves to nothing.

const TestLayer = AssistantTestLayer({
  types: [Text.Text],
});

const blueprintKey = 'org.dxos.blueprint.webSearch';

describe('Blueprint binding resolution (registry refs)', () => {
  it.effect(
    'a registry blueprint bound by its registry ref survives a feed round-trip',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;

        // Register the web-search blueprint in the db registry (the resolver's registry),
        // the same way `plugin-automation/RegistrySync` does in production.
        db.registry.add([WebSearchBlueprint.make()]);

        // Create a routine referencing the blueprint purely by registry URI. Once added to the
        // DB its blueprint ref is a resolver-backed registry ref — exactly the ref `prompt.ts`
        // binds.
        const routine = yield* Database.add(
          Routine.make({
            name: 'resolution-test',
            instructions: 'noop',
            blueprints: [Ref.fromURI(Blueprint.registryURI(blueprintKey))],
          }),
        );
        yield* Database.flush();
        const registryRef = routine.blueprints[0];

        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const runtime = yield* Effect.runtime<Database.Service>();

        // Bind the routine's own registry ref (the fix) and persist it to the feed.
        const writer = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => writer.open());
        yield* Effect.promise(() => writer.bind({ blueprints: [registryRef], objects: [] }));

        // A fresh binder on the same feed models the next agent turn / spawned process: no
        // in-memory cache, so the persisted binding ref must resolve on its own.
        const reader = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => reader.open()).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(3),
            onTimeout: () => new Error('TIMED OUT resolving bound blueprint on feed re-read'),
          }),
        );

        const resolved = reader.getBlueprints();
        expect(resolved.map((bp) => Blueprint.getKey(bp))).toContain(blueprintKey);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 20_000 },
  );

  it.effect(
    'a registry blueprint re-wrapped with Ref.make (EID ref) dangles on feed re-read',
    Effect.fnUntraced(
      function* ({ expect }) {
        const { db } = yield* Database.Service;
        db.registry.add([WebSearchBlueprint.make()]);

        const routine = yield* Database.add(
          Routine.make({
            name: 'resolution-test',
            instructions: 'noop',
            blueprints: [Ref.fromURI(Blueprint.registryURI(blueprintKey))],
          }),
        );
        yield* Database.flush();
        const blueprint = yield* Database.load(routine.blueprints[0]);

        const feed = yield* Database.add(Feed.make());
        yield* Database.flush();
        const runtime = yield* Effect.runtime<Database.Service>();

        // The pre-fix behaviour: re-wrap the resolved blueprint with `Ref.make`, minting an
        // EID ref that addresses a blueprint which only exists in the registry.
        const writer = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => writer.open());
        yield* Effect.promise(() => writer.bind({ blueprints: [Ref.make(blueprint)], objects: [] }));

        const reader = new AiContext.Binder({ feed, runtime });
        yield* Effect.promise(() => reader.open()).pipe(
          Effect.timeoutFail({
            duration: Duration.seconds(3),
            onTimeout: () => new Error('TIMED OUT resolving bound blueprint on feed re-read'),
          }),
        );

        // The EID ref cannot be recovered from the registry, so the fresh binder resolves nothing.
        const resolved = reader.getBlueprints();
        expect(resolved.map((bp) => Blueprint.getKey(bp))).not.toContain(blueprintKey);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 20_000 },
  );
});
