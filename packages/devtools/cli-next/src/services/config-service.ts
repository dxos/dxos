//
// Copyright 2025 DXOS.org
//

import { dirname } from 'node:path';

import { FileSystem } from '@effect/platform';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Yaml from 'yaml';

import { Config } from '@dxos/client';
import { DX_CONFIG, DX_DATA } from '@dxos/client-protocol';
import { getProfilePath } from '@dxos/client-protocol';

export const memoryConfig = new Config({
  runtime: {
    client: {
      edgeFeatures: {
        echoReplicator: true,
        feedReplicator: true,
        signaling: true,
        agents: true,
      },
    },
  },
});

export const defaultConfig = new Config({
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
      },
    },
    services: {
      edge: {
        url: 'wss://edge-production.dxos.workers.dev/',
      },
      iceProviders: [
        {
          urls: 'https://edge-production.dxos.workers.dev/ice',
        },
      ],
      ai: {
        server: 'https://ai-service.dxos.workers.dev',
      },
      ipfs: {
        server: 'https://api.ipfs.dxos.network/api/v0',
        gateway: 'https://gateway.ipfs.dxos.network/ipfs',
      },
    },
  },
});

// TODO(wittjosiah): Factor out.
export class ConfigService extends Context.Tag('ConfigService')<ConfigService, Config>() {
  static layerMemory = Layer.effect(ConfigService, Effect.succeed(memoryConfig));

  static load = (args: { config: Option.Option<string>; profile: string }) => {
    const defaultConfigPath = `${getProfilePath(DX_CONFIG, args.profile)}.yml`;
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const configPath = Option.getOrElse(args.config, () => defaultConfigPath);
      const configContent = yield* fs.readFileString(configPath);
      const configValues = Yaml.parse(configContent);
      return ConfigService.of(new Config(configValues));
    }).pipe(
      // If the config file doesn't exist, create it.
      Effect.catchTag('SystemError', () =>
        Effect.gen(function* () {
          const configValues = defaultConfig.values;
          {
            // Isolate DX_PROFILE storages.
            configValues.runtime ??= {};
            configValues.runtime.client ??= {};
            configValues.runtime.client.storage ??= {};
            configValues.runtime.client.storage.dataRoot = getProfilePath(
              configValues.runtime.client.storage.dataRoot ?? DX_DATA,
              args.profile,
            );
          }

          const fs = yield* FileSystem.FileSystem;
          yield* fs.makeDirectory(dirname(defaultConfigPath), { recursive: true });
          yield* fs.writeFileString(defaultConfigPath, Yaml.stringify(configValues));

          return ConfigService.of(new Config(configValues));
        }),
      ),
    );
  };
}
