//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer } from 'effect';

import { Client, Config } from '@dxos/client';

const defaultConfig = new Config({
  runtime: {
    client: {
      edgeFeatures: {
        echoReplicator: true,
        feedReplicator: true,
        signaling: true,
        agents: true,
      },
      storage: {
        persistent: true,
        dataRoot: './tmp/dx-profile',
      },
    },
    services: {
      edge: {
        url: 'http://localhost:8787',
      },
    },
  },
});

// TODO(wittjosiah): Factor out.
export class ClientService extends Context.Tag('ClientService')<ClientService, Client>() {
  static layer = Layer.scoped(
    ClientService,
    Effect.gen(function* () {
      // TODO(wittjosiah): Provide config via layer.
      const client = new Client({ config: defaultConfig });
      yield* Effect.tryPromise(() => client.initialize());
      yield* Effect.addFinalizer(() => Effect.tryPromise(() => client.destroy()).pipe(Effect.orDie));
      return client;
    }),
  );

  static memoryLayer = Layer.scoped(
    ClientService,
    Effect.gen(function* () {
      const client = new Client();
      yield* Effect.tryPromise(() => client.initialize());
      yield* Effect.addFinalizer(() => Effect.tryPromise(() => client.destroy()).pipe(Effect.orDie));
      return client;
    }),
  );
}
