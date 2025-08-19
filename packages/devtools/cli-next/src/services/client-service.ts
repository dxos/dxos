//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import { Client } from '@dxos/client';

import { ConfigService } from './config-service';

// TODO(burdon): How to get this from options?
const verbose = false;

// TODO(wittjosiah): Factor out.
export class ClientService extends Context.Tag('ClientService')<ClientService, Client>() {
  static layer = Layer.scoped(
    ClientService,
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const client = new Client({ config });
      yield* Effect.tryPromise(() => client.initialize());
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          if (verbose) {
            yield* Effect.log('Shutting down...');
          }

          yield* Effect.interruptible(
            Effect.raceFirst(
              // TODO(burdon): Sometimes hangs.
              Effect.tryPromise(() => client.destroy()).pipe(
                Effect.tap(() => verbose && Effect.log('OK')),
                Effect.orDie,
              ),
              // Timeout.
              Effect.gen(function* () {
                yield* Effect.sleep(1_000);
                if (process.env.DX_TRACK_LEAKS) {
                  (globalThis as any).wtf.dump();
                }
                return yield* Effect.die(new Error('Shutdown timeout reached'));
              }).pipe(Effect.orDie),
            ),
          );
        }),
      );

      return client;
    }),
  );
}
