//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ConfigService } from '@dxos/config';

import { Client } from './client.ts';

/** The host's client, behind an effect so a host can initialize it only once something uses it. */
export interface ClientHandle {
  /** The initialized client. A failed initialization is a defect carrying its cause. */
  readonly client: Effect.Effect<Client>;
}

// TODO(wittjosiah): Factor out.
export class ClientService extends Context.Service<ClientService, ClientHandle>()('ClientService') {
  /**
   * The initialized client. On a host that initializes lazily (the CLI), resolving it is what starts
   * initialization, so work that never resolves it never waits for the client or fails with it.
   */
  static readonly client: Effect.Effect<Client, never, ClientService> = Effect.flatMap(
    ClientService,
    (handle) => handle.client,
  );

  /** {@link layer}: initializes the client while the layer is built. */
  static get layer() {
    return layer;
  }

  /** {@link layerLazy}: initializes the client on its first use. */
  static get layerLazy() {
    return layerLazy;
  }
}

/** Hands over `client` as it is; a caller that needs it initialized initializes it first. */
export const fromClient = (client: Client) => Layer.succeed(ClientService, { client: Effect.succeed(client) });

/** Destroys `client` when the layer's scope closes, bounded so a hung teardown cannot block exit. */
const destroyOnClose = (client: Client) =>
  Effect.addFinalizer(() =>
    Effect.interruptible(
      Effect.raceAll([
        // TODO(burdon): Sometimes hangs even after logging OK (a Cloudflare socket, seen via `lsof -i`).
        Effect.tryPromise(() => client.destroy()).pipe(Effect.orDie),
        Effect.sleep(5_000).pipe(Effect.andThen(Effect.die(new Error('Client did not shutdown in time.')))),
      ]),
    ),
  );

/** Creates the client from `ConfigService` and initializes it while the layer is built. */
export const layer = Layer.effect(
  ClientService,
  Effect.gen(function* () {
    // TODO(wittjosiah): Use effect config instead?
    const config = yield* ConfigService;
    const client = new Client({ config });
    yield* Effect.tryPromise(() => client.initialize());
    yield* destroyOnClose(client);
    return ClientService.of({ client: Effect.succeed(client) });
  }),
);

/**
 * Creates the client from `ConfigService` but initializes it only on the first `ClientService.client`,
 * once however many fibers ask concurrently, so work that never uses the client never waits for it.
 */
export const layerLazy = Layer.effect(
  ClientService,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const client = new Client({ config });
    yield* destroyOnClose(client);
    const initialized = yield* Effect.cached(Effect.tryPromise(() => client.initialize()).pipe(Effect.orDie));
    return ClientService.of({ client: initialized.pipe(Effect.as(client)) });
  }),
);
