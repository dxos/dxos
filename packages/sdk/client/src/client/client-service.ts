//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ConfigService } from '@dxos/config';

import { Client } from './client';
// import { CommandConfig } from './command-config';

// TODO(wittjosiah): Factor out.
// TODO(dmaretskyi): For CLI its better to make this lazy to not load client in commands that do not require it.
export class ClientService extends Context.Tag('ClientService')<ClientService, Client>() {
  static fromClient = (client: Client) => Layer.succeed(ClientService, client);

  static layer = Layer.scoped(
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
}
