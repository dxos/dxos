//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import { dirname } from 'node:path';

import { DEFAULT_HUB_URL, DX_CONFIG, DX_DATA, getProfileConfigPath, getProfilePath } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { type Config as ConfigProto } from '@dxos/protocols/proto/dxos/config';

import { Config } from './config';

export const memoryConfig = new Config({
  runtime: {
    client: {
      edgeFeatures: {
        subductionReplicator: true,
        feedReplicator: true,
        signaling: true,
        agents: true,
      },
    },
  },
});

/**
 * Endpoints the CLI writes into a profile when it creates one. They belong in the file rather than
 * in {@link profileBuiltinDefaults} so the user can see and change what their CLI talks to; no code
 * path substitutes them later, so deleting one is a decision the CLI reports rather than papers over.
 */
export const defaultProfileEndpoints = new Config({
  runtime: {
    services: {
      hub: {
        url: DEFAULT_HUB_URL,
      },
      edge: {
        url: 'wss://dxos.network/',
      },
      iceProviders: [
        {
          urls: 'https://dxos.network/ice',
        },
      ],
      ipfs: {
        server: 'https://api.ipfs.dxos.network/api/v0',
        gateway: 'https://gateway.ipfs.dxos.network/ipfs',
      },
    },
  },
});

export class ConfigService extends Context.Service<ConfigService, Config>()('ConfigService') {
  static layerMemory = Layer.effect(ConfigService, Effect.succeed(memoryConfig));

  static fromConfig = (config: Config) => Layer.succeed(ConfigService, config);

  static load = (args: { config: Option.Option<string>; profile: string }) => {
    const defaultConfigPath = getProfileConfigPath(DX_CONFIG, args.profile);
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      // Loaded on demand: this node-side profile loader is exported from the browser barrel,
      // and the yaml parser must not ride the app's static boot graph.
      const Yaml = yield* Effect.promise(() => import('yaml'));
      const configPath = Option.getOrElse(args.config, () => defaultConfigPath);
      const configContent = yield* fs.readFileString(configPath);
      const configValues = Yaml.parse(configContent);
      return withProfileDefaults(configValues, args.profile);
    }).pipe(
      // If the config file doesn't exist, create it. v4 folds v3's `SystemError` and `BadArgument`
      // into one `PlatformError` tag; only the former was ever recovered here.
      Effect.catchTag('PlatformError', (error) =>
        error.reason._tag === 'BadArgument'
          ? Effect.fail(error)
          : Effect.gen(function* () {
              const Yaml = yield* Effect.promise(() => import('yaml'));
              // First run materializes the endpoints, and only the endpoints: features and storage
              // keep coming from profileBuiltinDefaults so they track the code, while what the CLI
              // talks to is stated in the file the user owns.
              const configValues = defaultProfileEndpoints.values;
              const fs = yield* FileSystem.FileSystem;
              const pathToCreate = Option.getOrElse(args.config, () => defaultConfigPath);
              yield* fs.makeDirectory(dirname(pathToCreate), { recursive: true });
              yield* fs.writeFileString(pathToCreate, Yaml.stringify(configValues));
              return withProfileDefaults(configValues, args.profile);
            }),
      ),
    );
  };
}

/**
 * Both load branches (existing file, first-run write) must layer env, file, and builtins in the same
 * order, or a freshly created profile would come up without storage or the hub.
 */
const withProfileDefaults = (configValues: ConfigProto, profile: string) =>
  ConfigService.of(new Config(processEnvDefaults(), configValues, profileBuiltinDefaults(profile).values));

/**
 * `DX_*` process env projected onto `runtime.app.env`, mirroring what the bundler config plugin does
 * for browser builds — without it those keys are unreachable on node, where nothing bundles the app.
 * Takes precedence over the profile config file, so `DX_HUB_URL=… dx …` overrides for one command.
 */
const processEnvDefaults = (): ConfigProto => {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key, value]) => key.startsWith('DX_') && value !== undefined),
  );
  return Object.keys(env).length > 0 ? { runtime: { app: { env } } } : {};
};

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
          subductionReplicator: true,
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
