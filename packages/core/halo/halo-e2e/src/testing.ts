//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';
import * as Stream from 'effect/Stream';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Identity, type Invitation, Space } from '@dxos/halo';
import { makeIdentityService, makeInvitationService, makeSpaceService } from '@dxos/halo-adapter-client';

/** Every HALO service, provided by one client adapter. */
export type HaloServices = Identity.Service | Space.Service | Invitation.Service;

/** Builds the HALO-services context for a client (all three adapter services). */
const clientContext = (client: Client): Context.Context<HaloServices> =>
  Context.empty().pipe(
    Context.add(Identity.Service, makeIdentityService(client)),
    Context.add(Space.Service, makeSpaceService(client)),
    Context.add(Invitation.Service, makeInvitationService(client)),
  );

/**
 * A scoped layer providing the three HALO services backed by a freshly-initialized client.
 * The client (and, by default, its identity) is created on build and destroyed on scope close,
 * so each test that provides this layer gets an isolated peer.
 */
export const makeClientLayer = (options?: { identity?: boolean }): Layer.Layer<HaloServices> =>
  Layer.scopedContext(
    Effect.gen(function* () {
      const client = new Client({ services: new TestBuilder().createLocalClientServices() });
      yield* Effect.addFinalizer(() => Effect.promise(() => client.destroy()));
      yield* Effect.promise(() => client.initialize());
      const context = clientContext(client);
      if (options?.identity !== false) {
        yield* Identity.create({ displayName: 'Peer' }).pipe(Effect.provide(context));
      }
      return context;
    }),
  );

/**
 * Spawns client peers on a shared in-memory network so they can invite one another. Used by
 * multi-client (invitation) tests; peers are torn down when the layer scope closes.
 */
export class TestNetwork extends Context.Tag('@dxos/halo-e2e/TestNetwork')<
  TestNetwork,
  {
    spawn(options?: { identity?: boolean }): Effect.Effect<Context.Context<HaloServices>>;
  }
>() {}

export const TestNetworkLive = Layer.scoped(
  TestNetwork,
  Effect.gen(function* () {
    const testBuilder = new TestBuilder();
    const clients: Client[] = [];
    yield* Effect.addFinalizer(() =>
      Effect.promise(async () => {
        await Promise.all(clients.map((client) => client.destroy()));
      }),
    );
    return {
      spawn: (options) =>
        Effect.gen(function* () {
          const index = clients.length;
          const client = new Client({ services: testBuilder.createLocalClientServices() });
          clients.push(client);
          yield* Effect.promise(() => client.initialize());
          const context = clientContext(client);
          if (options?.identity !== false) {
            yield* Identity.create({ displayName: `Peer ${index}` }).pipe(Effect.provide(context));
          }
          return context;
        }),
    };
  }),
);

const isTerminal = (event: Invitation.Event): boolean =>
  event._tag === 'success' || event._tag === 'cancelled' || event._tag === 'error';

/**
 * Consumes an invitation flow's event stream until its terminal event, returning that event.
 * The flow's streams/effects require no services.
 */
export const awaitTerminal = (flow: Invitation.Flow): Effect.Effect<Invitation.Event> =>
  flow.events.pipe(
    Stream.takeUntil(isTerminal),
    Stream.runLast,
    Effect.map(
      Option.getOrElse(
        (): Invitation.Event => ({ _tag: 'error', message: 'invitation stream ended without a terminal event' }),
      ),
    ),
    Effect.timeout(Duration.seconds(20)),
    Effect.orDie,
  );

/**
 * Repeats an effect until its result satisfies the predicate (bounded by a timeout). Effect-native
 * replacement for `expect.poll` when the polled read needs the service context.
 */
export const pollUntil = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  predicate: (value: A) => boolean,
): Effect.Effect<A, E, R> =>
  effect.pipe(
    Effect.repeat({ schedule: Schedule.spaced(Duration.millis(100)), until: predicate }),
    Effect.timeout(Duration.seconds(10)),
    Effect.orDie,
  );
