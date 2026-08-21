//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { SpaceState } from '@dxos/client/echo';
import { EffectEx } from '@dxos/effect';

import { TestLayer } from '../testing';
import { syncAllToEdge } from './space';

describe('syncAllToEdge', () => {
  test('drains every space, not just the default one', ({ expect }) =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.promise(() => client.halo.createIdentity());
      yield* Effect.promise(() => client.spaces.create({ name: 'first' }));
      yield* Effect.promise(() => client.spaces.create({ name: 'second' }));

      yield* syncAllToEdge();

      const spaces = client.spaces.get();
      expect(spaces.length).toBeGreaterThanOrEqual(2);
      // EDGE replication is skipped outside bun, so readiness across every space is what a local
      // run can observe: a command that drained only its own space would leave the rest closed.
      expect(spaces.map((space) => space.state.get())).toEqual(spaces.map(() => SpaceState.SPACE_READY));
    }).pipe(Effect.provide(TestLayer), Effect.scoped, EffectEx.runAndForwardErrors));
});
