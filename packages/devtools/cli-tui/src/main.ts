//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { AiService } from '@dxos/ai';
import { Client, Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';

import { App } from './app';
import { Core } from './core';

type Provider = 'edge' | 'lmstudio' | 'ollama';

const argv = yargs(hideBin(process.argv))
  .option('provider', {
    alias: 'p',
    type: 'string',
    choices: ['lmstudio', 'ollama', 'edge'] as const,
    default: 'edge' as Provider,
    description: 'AI provider to use',
  })
  .help()
  .parse();

const getLayer = (client: Client, space: Space, provider: Provider): Core.LayerFactoryResult => {
  switch (provider) {
    case 'lmstudio':
      return Core.createLMStudioLayer({ client, space });
    case 'ollama':
      return Core.createOllamaLayer({ client, space });
    case 'edge':
    default:
      return Core.createEdgeLayer({ client, space });
  }
};

const main = Effect.gen(function* () {
  const config = new Config({
    runtime: {
      client: {
        edgeFeatures: {
          signaling: true,
        },
      },
      services: {
        edge: {
          url: 'https://edge.dxos.workers.dev',
        },
        iceProviders: [
          {
            urls: 'https://edge.dxos.workers.dev/ice',
          },
        ],
      },
    },
  });

  const client = new Client({ config });
  yield* Effect.promise(async () => {
    console.log('initializing...');
    await client.initialize();
    const identity = client.halo.identity.get();
    if (!identity?.identityKey) {
      await client.halo.createIdentity();
    }

    // TODO(burdon): Clean-up init.
    await client.spaces.waitUntilReady();
    await client.spaces.default.waitUntilReady(); // TODO(burdon): BUG: Hangs if identity not created.
    console.log('initialized');
  });

  const space = client.spaces.default;
  const { layer, model } = getLayer(client, space, argv.provider as Provider);

  yield* Effect.gen(function* () {
    const services = yield* Effect.runtime<Core.AiChatServices>();
    const service = yield* AiService.AiService;
    if (!service.metadata) {
      throw new Error('AI service not available');
    }

    const core = new Core.Core(client, services, service.metadata.name, model);
    const app = new App(core);
    yield* Effect.promise(() => app.initialize());
  }).pipe(Effect.provide(layer));
});

void Effect.runPromiseExit(main as Effect.Effect<void, any, never>).then((exit) => {
  if (exit._tag === 'Failure') {
    console.error('Exit failure:');
    console.dir(exit.cause, { depth: 10 });
  }
});
