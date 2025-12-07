//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { AiModelResolver, type ModelName } from '@dxos/ai';
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
  provider: Provider,
  model?: string,
): { layer: Layer.Layer<Core.AiChatServices, never, never>; model: ModelName } => {
  switch (provider) {
    case 'lmstudio': {
      const modelName = (model ?? Core.DEFAULT_LMSTUDIO_MODEL) as ModelName;
      return {
        layer: Core.createLMStudioLayer(modelName),
        model: modelName,
      };
    }
    case 'ollama': {
      const modelName = (model ?? Core.DEFAULT_OLLAMA_MODEL) as ModelName;
      return {
        layer: Core.createOllamaLayer(modelName),
        model: modelName,
      };
    }
    case 'edge':
    default: {
      const modelName = (model ?? Core.DEFAULT_EDGE_MODEL) as ModelName;
      return {
        layer: Core.createTestLayer(modelName),
        model: modelName,
      };
    }
  }
};

const { layer, model } = getLayerAndModel(argv.provider as Provider, argv.model);

const main = Effect.gen(function* () {
  const resolver = yield* AiModelResolver.AiModelResolver;
  const services = yield* Effect.runtime<Core.AiChatServices>();
  const core = new Core.Core(services, resolver.name, model);
  const app = new App(core);
  yield* Effect.promise(() => app.initialize());
}).pipe(Effect.provide(layer));

void runAndForwardErrors(main);
