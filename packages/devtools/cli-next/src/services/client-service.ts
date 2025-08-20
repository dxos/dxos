//
// Copyright 2025 DXOS.org
//

import { Config, Context, Effect, Layer } from 'effect';

import { Client } from '@dxos/client';

import { ConfigService } from './config-service';

// TODO(wittjosiah): Factor out.
export class ClientService extends Context.Tag('ClientService')<ClientService, Client>() {
  static layer = Layer.scoped(
    ClientService,
    Effect.gen(function* () {
      const verbose = yield* Config.boolean('verbose');
      const config = yield* ConfigService;
      const client = new Client({ config });
      yield* Effect.tryPromise(() => client.initialize());
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          if (verbose) {
            yield* Effect.log('Shutting down...');
          }

          // Make the finalizer effect interruptible.
          yield* Effect.interruptible(
            Effect.raceAll([
              // Effect.repeat(Console.log('action...'), Schedule.fixed('1 second')),

              // Try to cleanly exit.
              Effect.tryPromise(() => client.destroy()).pipe(
                Effect.tap(() => {
                  // TODO(burdon): Sometimes hangs evem after logging OK.
                  // Cloudflare socket? (detected via `lsof -i`)
                  // 192.168.1.150:56747 -> 172.67.201.139:443
                  if (process.env.DX_TRACK_LEAKS) {
                    (globalThis as any).wtf.dump();
                  }
                  if (verbose) {
                    return Effect.log('OK');
                  }
                }),
                Effect.orDie,
              ),

              // Timeout.
              Effect.gen(function* () {
                yield* Effect.sleep(5_000);
                return yield* Effect.die(new Error('Shutdown timeout reached'));
              }).pipe(Effect.orDie),
            ]),
          );
        }),
      );

      return client;
    }),
  );
}
