//
// Copyright 2025 DXOS.org
//

import { Effect, Ref } from 'effect';

import { type Config } from '@dxos/config';
import { LogLevel, log } from '@dxos/log';
import { isNode } from '@dxos/util';

import buildSecrets from '../cli-observability-secrets.json';
import { type Extension } from '../observability-extension';
import { isObservabilityDisabled, storeObservabilityDisabled } from '../storage';

import { stubExtension } from './stub';

// TODO(wittjosiah): Environment & release version attributes.

export type ExtensionsOptions = {
  serviceName: string;
  serviceVersion: string;
  config: Config;
  endpoint?: string;
  authorizationHeader?: string;
};

export const extensions: (options: ExtensionsOptions) => Effect.Effect<Extension> = Effect.fn(function* ({
  serviceName,
  serviceVersion,
  config,
  endpoint: _endpoint,
  authorizationHeader: _authorizationHeader,
}) {
  const { OtelLogs, OtelTraces } = yield* Effect.promise(() => import('../otel'));

  // TODO(wittjosiah): Isomorphic storage.
  const cachedDisabled = yield* Effect.promise(() => isObservabilityDisabled(serviceName));
  const enabledRef = yield* Ref.make(!cachedDisabled);
  const tags = new Map<string, string>();

  const endpoint = isNode()
    ? (process.env.DX_OTEL_ENDPOINT ?? _endpoint ?? buildSecrets.OTEL_ENDPOINT)
    : config.get('runtime.app.env.DX_OTEL_ENDPOINT');
  const authorizationHeader = isNode()
    ? (process.env.DX_OTEL_AUTHORIZATION ?? _authorizationHeader ?? buildSecrets.OTEL_AUTHORIZATION)
    : config.get('runtime.app.env.DX_OTEL_AUTHORIZATION');

  if (!endpoint || !authorizationHeader) {
    log.warn('Missing OTEL_ENDPOINT or OTEL_AUTHORIZATION');
    return stubExtension;
  }

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
    initialize: Effect.fn(function* () {
      log.runtimeConfig.processors.push(logs.logProcessor);
      traces.start();
    }),
    enable: Effect.fn(function* () {
      yield* Effect.promise(() => storeObservabilityDisabled(serviceName, false));
      yield* Ref.update(enabledRef, () => true);
    }),
    disable: Effect.fn(function* () {
      yield* Effect.promise(() => storeObservabilityDisabled(serviceName, true));
      yield* Ref.update(enabledRef, () => false);
    }),
    close: () => Effect.promise(() => logs.close()),
    flush: () => Effect.promise(() => logs.flush()),
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
});
