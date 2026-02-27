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
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/protocols/buf';
import {
  ConfigSchema,
  RuntimeSchema,
  Runtime_ClientSchema,
  Runtime_Client_EdgeFeaturesSchema,
  Runtime_Client_StorageSchema,
  Runtime_ServicesSchema,
  Runtime_Services_AiSchema,
  Runtime_Services_EdgeSchema,
  Runtime_Services_IceProviderSchema,
  Runtime_Services_IpfsSchema,
} from '@dxos/protocols/buf/dxos/config_pb';

import { Config } from './config';

const defaultEdgeFeatures = create(Runtime_Client_EdgeFeaturesSchema, {
  echoReplicator: true,
  feedReplicator: true,
  signaling: true,
  agents: true,
});

export const memoryConfig = new Config(
  create(ConfigSchema, {
    runtime: create(RuntimeSchema, {
      client: create(Runtime_ClientSchema, {
        edgeFeatures: defaultEdgeFeatures,
      }),
    }),
  }),
);

export const defaultConfig = new Config(
  create(ConfigSchema, {
    runtime: create(RuntimeSchema, {
      client: create(Runtime_ClientSchema, {
        edgeFeatures: defaultEdgeFeatures,
        storage: create(Runtime_Client_StorageSchema, { persistent: true }),
      }),
      services: create(Runtime_ServicesSchema, {
        edge: create(Runtime_Services_EdgeSchema, {
          url: 'wss://edge-production.dxos.workers.dev/',
        }),
        iceProviders: [
          create(Runtime_Services_IceProviderSchema, {
            urls: 'https://edge-production.dxos.workers.dev/ice',
          }),
        ],
        ai: create(Runtime_Services_AiSchema, {
          server: 'https://ai-service.dxos.workers.dev',
        }),
        ipfs: create(Runtime_Services_IpfsSchema, {
          server: 'https://api.ipfs.dxos.network/api/v0',
          gateway: 'https://gateway.ipfs.dxos.network/ipfs',
        }),
      }),
    }),
  }),
);

export class ConfigService extends Context.Tag('ConfigService')<ConfigService, Config>() {
  static layerMemory = Layer.effect(ConfigService, Effect.succeed(memoryConfig));

  static fromConfig = (config: Config) => Layer.succeed(ConfigService, config);

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

  return new Config(
    create(ConfigSchema, {
      runtime: create(RuntimeSchema, {
        client: create(Runtime_ClientSchema, {
          edgeFeatures: defaultEdgeFeatures,
          storage: create(Runtime_Client_StorageSchema, {
            persistent: true,
            dataRoot: getProfilePath(DX_DATA, profile),
          }),
        }),
      }),
    }),
  );
};
