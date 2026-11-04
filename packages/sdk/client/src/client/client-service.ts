//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ConfigService } from '@dxos/config';

import { Client } from './client.ts';
// import { CommandConfig } from './command-config';

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
}

/** Hands over `client` as it is; a caller that needs it initialized initializes it first. */
export const fromClient = (client: Client) => Layer.succeed(ClientService, { client: Effect.succeed(client) });

export const layer = Layer.effect(
  ClientService,
  Effect.gen(function* () {
    // TODO(wittjosiah): Use effect config instead?
    // const verbose = yield* CommandConfig.isVerbose;
    const config = yield* ConfigService;
    const client = new Client({ config });
    yield* Effect.tryPromise(() => client.initialize());
    yield* Effect.addFinalizer(() =>
      Effect.gen(function* () {
        // if (verbose) {
        //   yield* Effect.log('Shutting down...');
        // }

        // Make the finalizer effect interruptible.
        yield* Effect.interruptible(
          Effect.raceAll([
            // Effect.repeat(Console.log('action...'), Schedule.fixed('1 second')),

            // Try to cleanly exit.
            // TODO(burdon): Sometimes hangs evem after logging OK.
            // Cloudflare socket? (detected via `lsof -i`)
            // 192.168.1.150:56747 -> 172.67.201.139:443
            Effect.tryPromise(() => client.destroy()).pipe(
              // Effect.tap(() => {
              //   if (verbose) {
              //     return Effect.log('OK');
              //   }
              // }),
              Effect.orDie,
            ),

            // Timeout.
            Effect.gen(function* () {
              yield* Effect.sleep(5_000);

              return yield* Effect.die(new Error('Client did not shutdown in time.'));
            }).pipe(Effect.orDie),
          ]),
        );
      }),
    );

    return ClientService.of({ client: Effect.succeed(client) });
  }),
);
