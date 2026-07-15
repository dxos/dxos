//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Identity, Invitation, Space } from '@dxos/halo';
import { makeIdentityService, makeSpaceService } from '@dxos/halo-adapter-client';

/** Every HALO service, provided by one client adapter. */
export type HaloServices = Identity.Service | Space.Service;

/** Builds the HALO-services context for a client (both adapter services). */
const clientContext = (client: Client): Context.Context<HaloServices> =>
  Context.empty().pipe(
    Context.add(Identity.Service, makeIdentityService(client)),
    Context.add(Space.Service, makeSpaceService(client)),
  );

/**
 * A scoped layer providing the HALO services backed by a freshly-initialized client.
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
        yield* Identity.create({ displayName: 'Peer' }).pipe(Effect.provide(context), Effect.orDie);
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
        // allSettled so one failed destroy() doesn't strand the remaining peers.
        await Promise.allSettled(clients.map((client) => client.destroy()));
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
            yield* Identity.create({ displayName: `Peer ${index}` }).pipe(Effect.provide(context), Effect.orDie);
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
    // filter + runHead so a stream that ends without a terminal event yields Option.none
    // (triggering the fallback), rather than returning the last non-terminal event.
    Stream.filter(isTerminal),
    Stream.runHead,
    Effect.map(
      Option.getOrElse(
        (): Invitation.Event => ({ _tag: 'error', message: 'invitation stream ended without a terminal event' }),
      ),
    ),
    Effect.timeout(Duration.seconds(20)),
    Effect.orDie,
  );

/**
 * Repeats an effect (100ms spacing, 10s cap) until its result satisfies the predicate. Returns
 * the satisfying value. Effect-native replacement for `expect.poll` when the polled read needs the
 * service context.
 */
export const pollUntil = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  predicate: (value: A) => boolean,
): Effect.Effect<A, never, R> => {
  const loop: Effect.Effect<A, E, R> = Effect.flatMap(effect, (value) =>
    predicate(value) ? Effect.succeed(value) : Effect.flatMap(Effect.sleep(Duration.millis(100)), () => loop),
  );
  return loop.pipe(Effect.timeout(Duration.seconds(10)), Effect.orDie);
};
