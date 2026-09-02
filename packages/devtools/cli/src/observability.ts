//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { type Client, type Config, DXOS_VERSION } from '@dxos/client';
import { DX_CONFIG, getProfilePath } from '@dxos/client-protocol';
import { log } from '@dxos/log';
import * as Observability from '@dxos/observability/Observability';
import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';
import { getHostPlatform } from '@dxos/util';

/**
 * Public write-only project tokens. A released binary reports to production, a source build to the
 * non-production project, and a test run or CI to neither.
 */
const PRODUCTION_TOKEN = 'phc_G8oXhAk9fw9kevIE8XGiYySvbMujJntU4anYimHdnUl';
const DEVELOPMENT_TOKEN = 'phc_GERCUvfEnYtleBgJRWuKnVQo1R59FBqwV5fvIor86Aa';
const POSTHOG_HOST = 'https://eu.i.posthog.com' as const;

/**
 * Where a released binary sends OTel: the deployment's reverse proxy, which injects the SigNoz
 * ingestion key server-side — so a binary published to npm carries no credential of its own.
 */
const OTEL_ENDPOINT = 'https://composer.space/api/otel';

/** Segments both backends; a released binary is production unless the environment says otherwise. */
const ENVIRONMENT = process.env.DX_ENVIRONMENT ?? (globalThis.DX_CLI_BUNDLED ? 'production' : 'development');

/** Where `dx` keeps the profile's observability state; also the OTel service name's sibling. */
export const observabilityNamespace = (profile: string): string => getProfilePath(DX_CONFIG, profile);

/**
 * Whether this process may report at all. A test run and CI report nowhere whatever they are
 * running — the smoke test runs the released binary, which would otherwise land in production.
 */
const reporting = (): boolean => !process.env.CI && !process.env.VITEST;

/** Released binaries report to the production project, a source build to the non-production one. */
export const projectToken = (): string | undefined => {
  if (!reporting()) {
    return undefined;
  }
  return globalThis.DX_CLI_BUNDLED ? PRODUCTION_TOKEN : DEVELOPMENT_TOKEN;
};

/**
 * Only a released binary has somewhere to send traces: there is one SigNoz tenant rather than a
 * production and a non-production one, so a source build opts in with `DX_OTEL_ENDPOINT` instead of
 * mixing developer noise into it.
 */
export const otelEndpoint = (): string | undefined =>
  reporting() && globalThis.DX_CLI_BUNDLED ? OTEL_ENDPOINT : undefined;

/**
 * The subcommand path, with flags and their values dropped: a flag value is a file path, a space
 * name or a prompt, none of which belongs in an event.
 */
export const commandPath = (argv: readonly string[]): string => {
  const path: string[] = [];
  for (const arg of argv) {
    if (arg.startsWith('-')) {
      break;
    }
    path.push(arg);
  }
  return path.join(' ') || 'dx';
};

export type InitializeOptions = {
  readonly config: Config;
  readonly namespace: string;
  /** Attribution for everything sent before an identity exists. */
  readonly distinctId: string | undefined;
};

/**
 * The `dx` observability instance: PostHog for events and errors, OTel for logs, metrics and traces.
 *
 * Mirrors Composer's `initializeObservability`. A disabled profile still builds an instance — the
 * plugin's capability has to resolve either way — but one whose extensions are stubs.
 */
export const initializeObservability = async ({ config, namespace, distinctId }: InitializeOptions) => {
  // Read before the extensions are built: an opted-out profile constructs no client at all, rather
  // than one that is told not to send. posthog-node has no persisted opt-out of its own.
  const disabled = await Observability.isObservabilityDisabled(namespace);
  return Function.pipe(
    Observability.make(),
    Observability.addExtension(
      ObservabilityExtension.Otel.extensions({
        serviceName: 'dx',
        serviceVersion: DXOS_VERSION,
        environment: ENVIRONMENT,
        namespace,
        endpoint: disabled ? undefined : otelEndpoint(),
        config,
        logs: true,
        metrics: true,
        traces: true,
      }),
    ),
    Observability.addExtension(
      ObservabilityExtension.PostHog.extensions({
        config,
        apiKey: disabled ? undefined : projectToken(),
        host: POSTHOG_HOST,
        release: DXOS_VERSION,
        environment: ENVIRONMENT,
        distinctId,
      }),
    ),
    Observability.addDataProvider(platformProvider),
    Observability.initialize,
    Effect.runPromise,
  );
};

/** Tags every event with where `dx` is running, matching Composer's `platformProvider`. */
const platformProvider: Observability.DataProvider = Effect.fn(function* (observability) {
  observability.setTags({ appPlatform: 'cli', osPlatform: getHostPlatform(), cliVersion: DXOS_VERSION });
});

/**
 * Binds the session to the identity once there is one.
 *
 * Aliased rather than simply identified so the installation's pre-identity events — `dx account`
 * before it succeeds, most of all — stay attached to the person they belong to.
 */
export const identifySession = (
  observability: Observability.Observability,
  client: Client,
  installationId: string | undefined,
): void => {
  const did = client.halo.identity.get()?.did;
  if (!did) {
    return;
  }
  if (installationId && installationId !== did) {
    observability.alias(did, installationId);
  } else {
    observability.identify(did);
  }
};

/**
 * Flushes on the way out, bounded: a command that has printed its answer must not hang on an
 * unreachable ingestion endpoint.
 */
export const flushObservability = (observability: Observability.Observability, timeout: number) =>
  observability.flush().pipe(
    Effect.timeout(timeout),
    Effect.catch((error) => Effect.sync(() => log('observability flush did not complete', { error }))),
  );
