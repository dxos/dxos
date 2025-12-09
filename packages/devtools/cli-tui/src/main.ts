//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { AiService } from '@dxos/ai';
import { GenericToolkit } from '@dxos/assistant';
import { Client, Config } from '@dxos/client';

import { App } from './app';
import { Core, TestToolkit } from './core';

const argv = yargs(hideBin(process.argv))
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Verbose logging',
  })
  .option('provider', {
    alias: 'p',
    type: 'string',
    choices: ['edge', 'lmstudio', 'ollama'] as const,
    default: 'edge' as Core.Provider,
    description: 'AI provider to use',
  })
  .help()
  .parse();

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
    await client.initialize();
    const identity = client.halo.identity.get();
    if (!identity?.identityKey) {
      await client.halo.createIdentity();
    }

    // TODO(burdon): Clean-up init.
    await client.spaces.waitUntilReady();
    await client.spaces.default.waitUntilReady(); // TODO(burdon): BUG: Hangs if identity not created.
  });

  const space = client.spaces.default;
  const { layer, model } = Core.getLayer(argv.provider as Core.Provider, { client, space });

  yield* Effect.gen(function* () {
    const services = yield* Effect.runtime<Core.AiChatServices>();
    const service = yield* AiService.AiService;
    if (!service.metadata) {
      throw new Error('AI service not available');
    }

    const core = new Core.Core(
      client,
      services,
      service.metadata.name,
      model,
      GenericToolkit.make(TestToolkit.toolkit, TestToolkit.layer),
    );
    const app = new App(core, argv.verbose);
    yield* Effect.promise(() => app.initialize());
  }).pipe(Effect.provide(layer));
});

void Effect.runPromiseExit(main as Effect.Effect<void, any, never>).then((exit) => {
  if (exit._tag === 'Failure') {
    console.error('Exit failure:');
    console.dir(exit.cause, { depth: 10 });
  }
});
