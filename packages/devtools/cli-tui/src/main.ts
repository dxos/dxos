//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { type ModelName } from '@dxos/ai';
import { Client, Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { runAndForwardErrors } from '@dxos/effect';

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
  .option('model', {
    alias: 'm',
    type: 'string',
    description: 'Model name to use',
  })
  .help()
  .parse();

const getLayerAndModel = (
  client: Client,
  space: Space,
  provider: Provider,
  model?: ModelName,
): { layer: Layer.Layer<Core.AiChatServices, never, never>; model: ModelName; resolverName: string } => {
  switch (provider) {
    case 'lmstudio': {
      const modelName = model ?? Core.DEFAULT_LMSTUDIO_MODEL;
      return {
        layer: Core.createLMStudioLayer({ client, space, model: modelName }),
        model: modelName,
        resolverName: 'LM Studio',
      };
    }
    case 'ollama': {
      const modelName = model ?? Core.DEFAULT_OLLAMA_MODEL;
      return {
        layer: Core.createOllamaLayer({ client, space, model: modelName }),
        model: modelName,
        resolverName: 'Ollama',
      };
    }
    case 'edge':
    default: {
      const modelName = model ?? Core.DEFAULT_EDGE_MODEL;
      return {
        layer: Core.createTestLayer({ client, space, model: modelName }),
        model: modelName,
        resolverName: 'EDGE',
      };
    }
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
  });

  const space = client.spaces.default;
  const { layer, model, resolverName } = getLayerAndModel(
    client,
    space,
    argv.provider as Provider,
    argv.model as ModelName,
  );

  return runAndForwardErrors(
    Effect.gen(function* () {
      const services = yield* Effect.runtime<Core.AiChatServices>();
      const core = new Core.Core(client, services, resolverName, model);
      const app = new App(core);
      yield* Effect.promise(() => app.initialize());
    }).pipe(Effect.provide(layer)),
  );
});

void runAndForwardErrors(main);
