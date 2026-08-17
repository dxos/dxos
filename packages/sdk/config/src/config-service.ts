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
import { log } from '@dxos/log';
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
      const { values: configValues, removed } = stripLegacyDefaultEndpoints(Yaml.parse(configContent));
      if (removed.length > 0) {
        // Rewritten, not just filtered on load: the endpoints were materialized without the user
        // asking, so they must leave the file rather than linger for every other reader of it.
        yield* fs.writeFileString(configPath, Yaml.stringify(configValues));
        log.info('removed endpoints written by an earlier version', { path: configPath, removed });
      }
      return withProfileDefaults(configValues, args.profile);
    }).pipe(
      // If the config file doesn't exist, create it. v4 folds v3's `SystemError` and `BadArgument`
      // into one `PlatformError` tag; only the former was ever recovered here.
      Effect.catchTag('PlatformError', (error) =>
        error.reason._tag === 'BadArgument'
          ? Effect.fail(error)
          : Effect.gen(function* () {
              const Yaml = yield* Effect.promise(() => import('yaml'));
              // First run materializes an EMPTY profile: the file records only user choices, while
              // features/storage come from profileBuiltinDefaults on every load (same as the read
              // path) — never a silently-defaulted endpoint.
              const configValues = new Config().values;
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

// Endpoints the removed `defaultConfig` materialized into every profile on first run; a profile
// created before that removal still carries them on disk.
const LEGACY_EDGE_URL = 'wss://dxos.network/';
const LEGACY_ICE_URLS = 'https://dxos.network/ice';
const LEGACY_IPFS_SERVER = 'https://api.ipfs.dxos.network/api/v0';
const LEGACY_IPFS_GATEWAY = 'https://gateway.ipfs.dxos.network/ipfs';

/**
 * Drops endpoints an earlier `ConfigService.load` wrote into the profile without the user choosing
 * them, so the no-defaults guarantee covers profiles that already exist and not just new ones.
 * Each literal is matched exactly — anything the user configured for themselves is left alone.
 */
const stripLegacyDefaultEndpoints = (values: ConfigProto): { values: ConfigProto; removed: string[] } => {
  const runtime = values?.runtime;
  const services = runtime?.services;
  if (!runtime || !services) {
    return { values, removed: [] };
  }

  const removed: string[] = [];
  const { edge, iceProviders, ipfs, ...rest } = services;
  const nextServices: typeof services = { ...rest };

  const { url, ...edgeRest } = edge ?? {};
  if (url === LEGACY_EDGE_URL) {
    removed.push('runtime.services.edge.url');
    if (Object.keys(edgeRest).length > 0) {
      nextServices.edge = edgeRest;
    }
  } else if (edge) {
    nextServices.edge = edge;
  }

  if (iceProviders?.length === 1 && isOnly(iceProviders[0], { urls: LEGACY_ICE_URLS })) {
    removed.push('runtime.services.iceProviders');
  } else if (iceProviders) {
    nextServices.iceProviders = iceProviders;
  }

  if (ipfs && isOnly(ipfs, { server: LEGACY_IPFS_SERVER, gateway: LEGACY_IPFS_GATEWAY })) {
    removed.push('runtime.services.ipfs');
  } else if (ipfs) {
    nextServices.ipfs = ipfs;
  }

  if (removed.length === 0) {
    return { values, removed };
  }

  const { services: _dropped, ...runtimeRest } = runtime;
  return {
    values: {
      ...values,
      runtime: Object.keys(nextServices).length > 0 ? { ...runtimeRest, services: nextServices } : runtimeRest,
    },
    removed,
  };
};

/** Whether `value` carries exactly `expected` — a subset match would strip a user's own additions. */
const isOnly = (value: object, expected: Record<string, string>): boolean =>
  Object.keys(value).length === Object.keys(expected).length &&
  Object.entries(value).every(([key, actual]) => expected[key] === actual);

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
      // Set here rather than in the file written for a new profile, and under the service key
      // rather than `runtime.app.env`: the latter outranks it in the resolver, so a built-in there
      // would shadow a hub URL the profile configures for itself.
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
