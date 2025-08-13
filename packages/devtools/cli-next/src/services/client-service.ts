//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import { Client } from '@dxos/client';

import { ConfigService } from './config-service';

// TODO(wittjosiah): Factor out.
export class ClientService extends Context.Tag('ClientService')<ClientService, Client>() {
  static layer = Layer.scoped(
    ClientService,
    Effect.gen(function* () {
      const config = yield* ConfigService;
      const client = new Client({ config });
      yield* Effect.tryPromise(() => client.initialize());
      yield* Effect.addFinalizer(() => Effect.tryPromise(() => client.destroy()).pipe(Effect.orDie));
      return client;
    }),
  );
}
