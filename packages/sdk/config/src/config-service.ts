//
// Copyright 2025 DXOS.org
//

import { dirname } from 'node:path';

import * as FileSystem from '@effect/platform/FileSystem';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Yaml from 'yaml';

import { DX_CONFIG, DX_DATA } from '@dxos/client-protocol';
import { getProfilePath } from '@dxos/client-protocol';

import { Config } from './config';
import { invariant } from '@dxos/invariant';

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

// TODO(wittjosiah): Factor out -- this should go to the CLI.
export class ConfigService extends Context.Tag('ConfigService')<ConfigService, Config>() {
  static layerMemory = Layer.effect(ConfigService, Effect.succeed(memoryConfig));

  static load = (args: { config: Option.Option<string>; profile: string }) => {
    const defaultConfigPath = `${getProfilePath(DX_CONFIG, args.profile)}.yml`;
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const configPath = Option.getOrElse(args.config, () => defaultConfigPath);
      const configContent = yield* fs.readFileString(configPath);
      const configValues = Yaml.parse(configContent);
      return ConfigService.of(new Config(configValues, profileBuiltinDefaults(args.profile).values));
    }).pipe(
      // If the config file doesn't exist, create it.
      Effect.catchTag('SystemError', () =>
        Effect.gen(function* () {
          const configValues = defaultConfig.values;
          const fs = yield* FileSystem.FileSystem;
          yield* fs.makeDirectory(dirname(defaultConfigPath), { recursive: true });
          yield* fs.writeFileString(defaultConfigPath, Yaml.stringify(configValues));

          return ConfigService.of(new Config(configValues));
        }),
      ),
    );
  };
}

/**
 * Default config for a profile.
 * Always merged with the default config.
 */
const profileBuiltinDefaults = (profile: string) => {
  invariant(!profile.endsWith('.yml'));

  return new Config({
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
          dataRoot: getProfilePath(DX_DATA, profile),
        },
      },
    },
  });
};
