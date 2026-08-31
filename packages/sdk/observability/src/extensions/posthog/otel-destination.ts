//
// Copyright 2026 DXOS.org
//

import { type Config, getEnvString } from '@dxos/config';
import { log } from '@dxos/log';

import { type OtelDestination } from '../otel/otel';

/** PostHog serves OTLP under `/i`, not at the root. */
const OTLP_PATH_PREFIX = '/i';

/**
 * PostHog as an OTLP backend, authenticated with the public `phc_` project token rather than a
 * secret, so the browser can post to it directly.
 */
export const otelDestination = (config: Config): OtelDestination | undefined => {
  const host = getEnvString(config, 'DX_POSTHOG_OTEL_HOST');
  const apiKey = getEnvString(config, 'DX_POSTHOG_API_KEY');
  if (!host) {
    return undefined;
  }
  if (!apiKey) {
    log.info('DX_POSTHOG_OTEL_HOST is set without DX_POSTHOG_API_KEY; skipping PostHog OTLP export');
    return undefined;
  }

  return {
    endpoint: `${host.replace(/\/$/, '')}${OTLP_PATH_PREFIX}`,
    headers: { Authorization: `Bearer ${apiKey}` },
  };
};
