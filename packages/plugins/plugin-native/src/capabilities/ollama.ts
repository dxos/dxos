//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import { Command } from '@tauri-apps/plugin-shell';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { type AiModelResolver } from '@dxos/ai';
import { OllamaResolver } from '@dxos/ai/resolvers';
import { Capabilities, type Capability, type PluginContext, contributes } from '@dxos/app-framework';
import { log } from '@dxos/log';

// Running ollama on non-standard port.
const OLLAMA_HOST = 'http://localhost:21434';

export default (_context: PluginContext): Capability<any> => {
  const runtime = ManagedRuntime.make(OllamaSidecar.layerLive);

  // Layer for the sidecar but the lifecycle is managed by the runtime.
  const sidecarLayer = Layer.effectContext(
    runtime.runtimeEffect.pipe(Effect.map((rt) => rt.context.pipe(Context.pick(OllamaSidecar)))),
  );

  return contributes(
    Capabilities.AiModelResolver,
    OllamaSidecarModelResolver.pipe(Layer.provide(sidecarLayer)),
    async () => {
      await runtime.dispose();
    },
  );
};

class OllamaSidecar extends Context.Tag('@dxos/plugin-native/OllamaSidecar')<
  OllamaSidecar,
  {
    endpoint: string;
  }
>() {
  static layerLive = Layer.scoped(
    OllamaSidecar,
    Effect.gen(function* () {
      const command = Command.sidecar('sidecar/ollama', ['serve'], {
        env: {
          OLLAMA_HOST,
          OLLAMA_ORIGINS: '*', // CORS
        },
      });

      // NOTE: Keeping those as console.log for consistent formatting.
      command.stdout.on('data', (data) => console.log('[ollama]', data.toString()));
      command.stderr.on('data', (data) => console.error('[ollama]', data.toString()));
      command.on('close', (code) => log.info('Ollama process exited', { code }));
      command.on('error', (error) => log.error('Ollama error', { error }));
      const child = yield* Effect.promise(() => command.spawn());
      yield* Effect.addFinalizer(
        Effect.fn(function* () {
          yield* Effect.promise(() => child.kill());
        }),
      );
      log.info('Running ollama', { pid: child.pid });

      return {
        endpoint: OLLAMA_HOST,
      };
    }),
  );
}

const OllamaSidecarModelResolver: Layer.Layer<AiModelResolver.AiModelResolver, never, OllamaSidecar> =
  Layer.unwrapEffect(
    Effect.gen(function* () {
      const { endpoint } = yield* OllamaSidecar;
      return OllamaResolver.OllamaResolver({
        host: endpoint,
        transformClient: HttpClient.withTracerPropagation(false),
      });
    }),
  ).pipe(Layer.provide(FetchHttpClient.layer));
