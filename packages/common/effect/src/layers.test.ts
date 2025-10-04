//
// Copyright 2025 DXOS.org
//

import { it } from '@effect/vitest';
import { Context, Duration, Effect, Layer, ManagedRuntime } from 'effect';
import { test } from 'vitest';

class ClientConfig extends Context.Tag('ClientConfig')<ClientConfig, { endpoint: string }>() {}

class Client extends Context.Tag('Client')<Client, { call: () => Effect.Effect<void> }>() {
  static layer = Layer.effect(
    Client,
    Effect.gen(function* () {
      const config = yield* ClientConfig;
      return {
        call: () => {
          console.log('called', config.endpoint);
          return Effect.void;
        },
      };
    }),
  );
}

const ServerLive = Layer.scoped(
  ClientConfig,
  Effect.gen(function* () {
    console.log('start server');

    yield* Effect.sleep(Duration.millis(100));

    yield* Effect.addFinalizer(
      Effect.fn(function* () {
        yield* Effect.sleep(Duration.millis(100));
        console.log('stop server');
      }),
    );

    return {
      endpoint: 'http://localhost:8080',
    };
  }),
);

it.effect.skip(
  'test',
  Effect.fn(
    function* (_) {
      const client = yield* Client;
      yield* client.call();
    },
    Effect.provide(Layer.provide(Client.layer, ServerLive)),
  ),
);

class ServerPlugin {
  #runtime = ManagedRuntime.make(ServerLive);

  readonly clientConfigLayer = Layer.effectContext(
    this.#runtime.runtimeEffect.pipe(Effect.map((rt) => rt.context.pipe(Context.pick(ClientConfig)))),
  );

  async dispose() {
    await this.#runtime.dispose();
  }
}

class ClientPlugin {
  constructor(private readonly _serverPlugin: ServerPlugin) {}

  async run() {
    const layer = Layer.provide(Client.layer, this._serverPlugin.clientConfigLayer);

    await Effect.runPromise(
      Effect.gen(function* () {
        const client = yield* Client;
        yield* client.call();
      }).pipe(Effect.provide(layer)),
    );
  }
}

test.skip('plugins', async () => {
  const serverPlugin = new ServerPlugin();
  console.log('ServerPlugin created');

  await Effect.runPromise(Effect.sleep(Duration.millis(500)));
  console.log('wake up');

  {
    const clientPlugin1 = new ClientPlugin(serverPlugin);
    console.log('ClientPlugin1 created');
    await clientPlugin1.run();
    console.log('client1 run');
  }

  {
    const clientPlugin2 = new ClientPlugin(serverPlugin);
    console.log('ClientPlugin2 created');
    await clientPlugin2.run();
    console.log('client2 run');
  }

  await serverPlugin.dispose();
});
