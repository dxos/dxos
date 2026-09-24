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

import { Config } from './config.ts';
import { EDGE_URLS } from './edge-services.ts';
import { type ConfigInit } from './types.ts';

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
 * Endpoints the CLI writes into a profile when it creates one, kept out of
 * {@link profileBuiltinDefaults} so the user can see and change what their CLI talks to.
 */
export const defaultProfileEndpoints = new Config({
  runtime: {
    services: {
      hub: {
        url: DEFAULT_HUB_URL,
      },
      edge: {
        url: `${EDGE_URLS.production}/`,
      },
      iceProviders: [
        {
          urls: `${EDGE_URLS.production}/ice`,
        },
      ],
      ipfs: {
        server: 'https://api.ipfs.dxos.network/api/v0',
        gateway: 'https://gateway.ipfs.dxos.network/ipfs',
      },
    },
  },
});

/** Aligns a fresh monorepo CLI profile with the backend Composer's local dev server talks to. */
export const localDevConfig = new Config(
  { runtime: { services: { edge: { url: EDGE_URLS.preview } } } },
  defaultProfileEndpoints.values,
);

export class ConfigService extends Context.Service<ConfigService, Config>()('ConfigService') {
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
              // First run materializes only the endpoints — features and storage keep coming from
              // profileBuiltinDefaults so they track the code, while what the CLI talks to is stated
              // in the file the user owns.
              const useLocalDev = process.env.DX_LOCAL_DEV !== undefined && process.env.DX_LOCAL_DEV !== '0';
              const configValues = (useLocalDev ? localDevConfig : defaultProfileEndpoints).values;
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

export const layerMemory = Layer.effect(ConfigService, Effect.succeed(memoryConfig));

export const fromConfig = (config: Config) => Layer.succeed(ConfigService, config);

/**
 * Both load branches (existing file, first-run write) must layer env, file, and builtins in the same
 * order, or a freshly created profile would come up without storage or the hub.
 */
const withProfileDefaults = (configValues: ConfigInit, profile: string) =>
  ConfigService.of(new Config(processEnvDefaults(), configValues, profileBuiltinDefaults(profile).values));

/**
 * `DX_*` process env projected onto `runtime.app.env`, mirroring what the bundler config plugin does
 * for browser builds — without it those keys are unreachable on node, where nothing bundles the app.
 * Takes precedence over the profile config file, so `DX_HUB_URL=… dx …` overrides for one command.
 */
const processEnvDefaults = (): ConfigInit => {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('DX_') && value !== undefined) {
      env[key] = value;
    }
  }
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
      // Kept as a load-time default, not written per profile: profiles created before the endpoints
      // moved into the file have no `hub` key, and without this every `dx hub` command breaks on upgrade.
      services: {
        hub: {
          url: DEFAULT_HUB_URL,
        },
      },
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
