//
// Copyright 2025 DXOS.org
//

// NOTE: localStorage is not available in web workers.
import { Effect, Ref } from 'effect';
import * as localForage from 'localforage';

import { type Config } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { LogLevel, log } from '@dxos/log';
import { isNode } from '@dxos/util';

import buildSecrets from '../../cli-observability-secrets.json';
import { type Extension } from '../observability-extension';

const ENABLED_KEY = 'dxos:observability:enabled';

export type ExtensionsOptions = {
  serviceName: string;
  serviceVersion: string;
  config: Config;
  endpoint?: string;
  authorizationHeader?: string;
};

export const extensions = async ({
  serviceName,
  serviceVersion,
  config,
  endpoint: _endpoint,
  authorizationHeader: _authorizationHeader,
}: ExtensionsOptions): Promise<Extension> => {
  const { OtelLogs, OtelTraces } = await import('../../otel');

  const enabledRef = await Effect.gen(function* () {
    // TODO(wittjosiah): Isomorphic storage.
    const cached = yield* Effect.promise(() => localForage.getItem(ENABLED_KEY));
    const enabled = yield* Ref.make(cached !== 'false');
    return enabled;
  }).pipe(Effect.runPromise);
  const tags = new Map<string, string>();

  const endpoint = isNode()
    ? (process.env.DX_OTEL_ENDPOINT ?? _endpoint ?? buildSecrets.OTEL_ENDPOINT)
    : config.get('runtime.app.env.DX_OTEL_ENDPOINT');
  const authorizationHeader = isNode()
    ? (process.env.DX_OTEL_AUTHORIZATION ?? _authorizationHeader ?? buildSecrets.OTEL_AUTHORIZATION)
    : config.get('runtime.app.env.DX_OTEL_AUTHORIZATION');
  invariant(endpoint, 'Missing OTEL_ENDPOINT');
  invariant(authorizationHeader, 'Missing OTEL_AUTHORIZATION');

  const logs = new OtelLogs({
    endpoint,
    authorizationHeader,
    serviceName,
    serviceVersion,
    getTags: () => Object.fromEntries(tags),
    logLevel: LogLevel.VERBOSE,
    includeSharedWorkerLogs: false,
  });

  const traces = new OtelTraces({
    endpoint,
    authorizationHeader,
    serviceName,
    serviceVersion,
    getTags: () => Object.fromEntries(tags),
  });

  return {
    initialize: () => {
      log.runtimeConfig.processors.push(logs.logProcessor);
      traces.start();
    },
    enable: () =>
      Effect.gen(function* () {
        yield* Effect.promise(() => localForage.setItem(ENABLED_KEY, 'true'));
        yield* Ref.update(enabledRef, () => true);
      }).pipe(Effect.runPromise),
    disable: () =>
      Effect.gen(function* () {
        yield* Effect.promise(() => localForage.setItem(ENABLED_KEY, 'false'));
        yield* Ref.update(enabledRef, () => false);
      }).pipe(Effect.runPromise),
    close: () => logs.close(),
    flush: () => logs.flush(),
    setTags: (incomingTags) => {
      for (const [key, value] of Object.entries(incomingTags)) {
        tags.set(key, value);
      }
    },
    get enabled() {
      return Ref.get(enabledRef).pipe(Effect.runSync);
    },
    apis: [{ kind: 'logs' }, { kind: 'traces' }],
  };
};
