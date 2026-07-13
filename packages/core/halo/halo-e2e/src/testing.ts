//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import { onTestFinished } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { EffectEx } from '@dxos/effect';
import { Identity } from '@dxos/halo';
import type { Invitation, Space } from '@dxos/halo';
import { layerClient } from '@dxos/halo-adapter-client';
import { range } from '@dxos/util';

/** Every HALO service, provided by one client adapter. */
export type HaloServices = Identity.Service | Space.Service | Invitation.Service;

/**
 * Runs a HALO program against a client via the client adapter, returning a promise (rejecting on
 * a typed failure). All three services are provided.
 */
export const runWith = <A, E>(client: Client, program: Effect.Effect<A, E, HaloServices>): Promise<A> =>
  EffectEx.runPromise(Effect.provide(program, layerClient(client)));

/**
 * Runs a flow's service-free Effect (e.g. `flow.code`) to a promise.
 */
export const runFlow = <A, E>(program: Effect.Effect<A, E>): Promise<A> => EffectEx.runPromise(program);

/**
 * Creates `count` clients sharing an in-memory network (so they can invite one another).
 * Registers teardown with the current test. When `identity` is set, each client creates an
 * identity through the new API.
 */
export const createClients = async (count: number, options?: { identity?: boolean }): Promise<Client[]> => {
  const testBuilder = new TestBuilder();
  const clients = range(count, () => new Client({ services: testBuilder.createLocalClientServices() }));
  onTestFinished(async () => {
    await Promise.all(clients.map((client) => client.destroy()));
  });

  await Promise.all(
    clients.map(async (client, index) => {
      await client.initialize();
      if (options?.identity !== false) {
        await runWith(client, Identity.create({ displayName: `Peer ${index}` }));
      }
    }),
  );
  return clients;
};

const isTerminal = (event: Invitation.Event): boolean =>
  event._tag === 'success' || event._tag === 'cancelled' || event._tag === 'error';

/**
 * Consumes an invitation flow's event stream until its terminal event, returning that event.
 * The flow's streams/effects require no services, so no layer is needed here.
 */
export const awaitTerminal = (flow: Invitation.Flow): Promise<Invitation.Event> =>
  EffectEx.runPromise(
    flow.events.pipe(
      Stream.takeUntil(isTerminal),
      Stream.runLast,
      Effect.map(
        Option.getOrElse(
          (): Invitation.Event => ({ _tag: 'error', message: 'invitation stream ended without a terminal event' }),
        ),
      ),
      Effect.timeout('20 seconds'),
    ),
  );
