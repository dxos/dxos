//
// Copyright 2023 DXOS.org
//

import { ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';

/**
 * Fetches the local kube config and returns the telemetry tags.
 * Intention is to use this to tag telemetry events as `internal`.
 */
export const getLocalTelemetryTags = async (): Promise<string[]> => {
  // NOTE: We use the local kube config to get the telemetry tags.
  // We use localhost and not `kube.local` here because it is allowed to make requests to localhost without CORS.
  const localKubeConfigUrl = 'http://localhost:80/.well-known/dx/config';

  log('fetching config...', { localKubeConfigUrl });
  try {
    return await fetch(localKubeConfigUrl).then((res) =>
      (res.json() as Promise<ConfigProto>).then((config) => config?.runtime?.kube?.telemetry?.tags ?? []),
    );
  } catch (error) {
    log('Failed to fetch telemetry tags', error);
    return [];
  }
};
