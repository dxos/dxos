//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe } from 'vitest';

import { Identity, Space } from '@dxos/halo';

import { TestNetwork, TestNetworkLive, awaitTerminal, makeClientLayer, pollUntil } from './testing';

describe('Invitations', () => {
  it.effect(
    'device invitation admits a new device to the identity',
    Effect.fn(function* ({ expect }) {
      const network = yield* TestNetwork;
      const host = yield* network.spawn();
      const guest = yield* network.spawn({ identity: false });

      const hostFlow = yield* Identity.share().pipe(Effect.provide(host));
      const code = yield* hostFlow.code;
      const guestFlow = yield* Identity.join(code).pipe(Effect.provide(guest));

      const [hostTerminal, guestTerminal] = yield* Effect.all([awaitTerminal(hostFlow), awaitTerminal(guestFlow)], {
        concurrency: 'unbounded',
      });
      expect(hostTerminal._tag).toEqual('success');
      expect(guestTerminal._tag).toEqual('success');

      // The guest joined the host's identity.
      const guestIdentity = yield* Identity.current.pipe(Effect.provide(guest));
      const hostIdentity = yield* Identity.current.pipe(Effect.provide(host));
      expect(Option.getOrThrow(guestIdentity).did).toEqual(Option.getOrThrow(hostIdentity).did);

      // The host now sees two devices.
      yield* pollUntil(Identity.devices.pipe(Effect.provide(host)), (devices) => devices.length === 2);
    }, Effect.provide(TestNetworkLive)),
    30_000,
  );

  it.effect(
    'space invitation admits a new member',
    Effect.fn(function* ({ expect }) {
      const network = yield* TestNetwork;
      const host = yield* network.spawn();
      const guest = yield* network.spawn();

      const space = yield* Space.create({ name: 'shared' }).pipe(Effect.provide(host));
      yield* Space.waitReady(space.id).pipe(Effect.provide(host));

      const hostFlow = yield* Space.share(space.id).pipe(Effect.provide(host));
      const code = yield* hostFlow.code;
      const guestFlow = yield* Space.join(code).pipe(Effect.provide(guest));

      const [hostTerminal, guestTerminal] = yield* Effect.all([awaitTerminal(hostFlow), awaitTerminal(guestFlow)], {
        concurrency: 'unbounded',
      });
      expect(hostTerminal._tag).toEqual('success');
      expect(guestTerminal._tag).toEqual('success');

      // The host space now has two members.
      yield* pollUntil(Space.members(space.id).pipe(Effect.provide(host)), (members) => members.length === 2);

      // The guest gained access to the space.
      yield* pollUntil(Space.list.pipe(Effect.provide(guest)), (spaces) => spaces.length > 0);
    }, Effect.provide(TestNetworkLive)),
    30_000,
  );

  // NOTE: `Space.updateMemberRole` / `removeMember` are defined and the adapter maps them to
  // `space.updateMemberRole`, but removal re-keys the space and does not converge reliably in the
  // in-memory test harness, so it is not exercised e2e here.

  it.effect(
    'active invitations are observable for a space',
    Effect.fn(function* ({ expect }) {
      const space = yield* Space.create({ name: 'shared' });
      yield* Space.waitReady(space.id);

      yield* Space.share(space.id);
      const active = yield* Space.invitations(space.id);
      expect(active.length).toBeGreaterThan(0);
      expect(active[0].kind).toEqual('space');
    }, Effect.provide(makeClientLayer())),
    30_000,
  );
});
