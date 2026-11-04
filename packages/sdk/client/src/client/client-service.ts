//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { ConfigService } from '@dxos/config';

import { Client } from './client.ts';
// import { CommandConfig } from './command-config';

// TODO(wittjosiah): Factor out.
// TODO(dmaretskyi): For CLI its better to make this lazy to not load client in commands that do not require it.
export class ClientService extends Context.Service<ClientService, Client>()('ClientService') {}

export const fromClient = (client: Client) => Layer.succeed(ClientService, client);

/**
 * Waits until the host's client has initialized, failing with the cause that stopped it.
 *
 * A host may provide `ClientService` before its client has initialized, so work that never uses the
 * client does not wait for it; work that does resolves the client with {@link initializedClient}.
 */
export class ClientInitialization extends Context.Service<ClientInitialization, Effect.Effect<void, Error>>()(
  'ClientInitialization',
) {}

/** The host's client once it has initialized; without a {@link ClientInitialization} it is handed over as is. */
export const initializedClient: Effect.Effect<Client, Error, ClientService> = Effect.gen(function* () {
  const initialization = yield* Effect.serviceOption(ClientInitialization);
  if (Option.isSome(initialization)) {
    yield* initialization.value;
  }
  return yield* ClientService;
});

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

    return client;
  }),
);
