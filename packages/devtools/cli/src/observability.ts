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

declare global {
  // eslint-disable-next-line no-var
  var DX_CLI_POSTHOG_TOKEN: string | undefined;
}

const POSTHOG_HOST = 'https://eu.i.posthog.com';

const OTEL_ENDPOINT = 'https://composer.space/api/otel';

const ENVIRONMENT = process.env.DX_ENVIRONMENT ?? (globalThis.DX_CLI_BUNDLED ? 'production' : 'dev');

export const observabilityNamespace = (profile: string): string => getProfilePath(DX_CONFIG, profile);

/** A test run and CI report nowhere whatever they are running, including the released binary. */
const isTestOrCi = (): boolean => Boolean(process.env.CI || process.env.VITEST);

export const projectToken = (): string | undefined => {
  if (isTestOrCi()) {
    return undefined;
  }
  return process.env.DX_POSTHOG_API_KEY || (globalThis.DX_CLI_BUNDLED ? globalThis.DX_CLI_POSTHOG_TOKEN : undefined);
};

export const otelEndpoint = (): string | undefined =>
  !isTestOrCi() && globalThis.DX_CLI_BUNDLED ? OTEL_ENDPOINT : undefined;

type CommandNode = {
  readonly name: string;
  readonly subcommands: ReadonlyArray<{ readonly commands: ReadonlyArray<CommandNode> }>;
};

/** The subcommand path the argv selects, matched against the command tree. */
export const commandPath = (root: CommandNode, argv: readonly string[]): string => {
  const path: string[] = [];
  let node = root;
  for (const arg of argv) {
    const next = node.subcommands.flatMap((group) => group.commands).find((candidate) => candidate.name === arg);
    if (!next) {
      break;
    }
    path.push(next.name);
    node = next;
  }
  return path.join(' ') || 'dx';
};

export type InitializeOptions = {
  readonly config: Config;
  readonly namespace: string;
  readonly distinctId: string | undefined;
};

export const initializeObservability = Effect.fn(function* ({ config, namespace, distinctId }: InitializeOptions) {
  const disabled = yield* Effect.promise(() => Observability.isObservabilityDisabled(namespace));
  return yield* Function.pipe(
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
        release: DXOS_VERSION,
        environment: ENVIRONMENT,
        node: {
          apiKey: disabled ? undefined : projectToken(),
          host: POSTHOG_HOST,
          distinctId,
          mcpServer: { name: 'dxos-cli', version: DXOS_VERSION },
        },
      }),
    ),
    Observability.addDataProvider(platformProvider),
    Observability.initialize,
  );
});

const platformProvider: Observability.DataProvider = Effect.fn(function* (observability) {
  observability.setTags({ appPlatform: 'cli', osPlatform: getHostPlatform(), cliVersion: DXOS_VERSION });
});

/**
 * Binds the session to the identity, aliasing from the installation id the once so the events sent
 * before the identity existed reach the same person. The transition is recorded, or every later run
 * would alias again.
 */
export const identifySession = async (
  observability: Observability.Observability,
  client: Client,
  namespace: string,
  installationId: string | undefined,
): Promise<void> => {
  const did = client.halo.identity.get()?.did;
  if (!did) {
    return;
  }
  const transitioning = installationId !== undefined && installationId !== did;
  if (transitioning && (await Observability.getAliasedDid(namespace)) !== did) {
    observability.alias(did, installationId);
    await Observability.storeAliasedDid(namespace, did);
  } else {
    observability.identify(did);
  }
};

export const flushObservability = (observability: Observability.Observability, timeout: number) =>
  observability.flush().pipe(
    Effect.timeout(timeout),
    Effect.catch((error) => Effect.sync(() => log('observability flush did not complete', { error }))),
  );
