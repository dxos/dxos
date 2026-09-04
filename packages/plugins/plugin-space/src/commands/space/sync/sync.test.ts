//
// Copyright 2025 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { TestLayer } from '@dxos/cli-util/testing';
import { ClientService } from '@dxos/client';
import { SpaceState } from '@dxos/client/echo';
import { EffectEx } from '@dxos/effect';

import { handler } from './sync';

describe('spaces sync', () => {
  // TODO(wittjosiah): Need to create a mock edge to sync with.
  test.todo('should sync a synced space');
  test.todo('should sync an unsynced space');
  test.todo('should sync a missing space');

  test('omitting the space id drains every space, not just the default one', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.promise(() => client.halo.createIdentity());
      yield* Effect.promise(() => client.spaces.create({ name: 'first' }));
      yield* Effect.promise(() => client.spaces.create({ name: 'second' }));

      yield* handler({ spaceId: Option.none(), spaceTimeout: 5000 });

      // EDGE replication is skipped outside bun, so opening every space is what a local run can
      // observe: resolving the default space alone would leave the others closed.
      const spaces = client.spaces.get();
      expect(spaces.length).toBeGreaterThanOrEqual(2);
      expect(spaces.map((space) => space.state.get())).toEqual(spaces.map(() => SpaceState.SPACE_READY));
    }).pipe(Effect.provide(TestLayer), Effect.scoped, EffectEx.runAndForwardErrors));
});
