//
// Copyright 2026 DXOS.org
//

import { type ConfigInit } from '@dxos/config';

export type ConfigSources = {
  /** Settings persisted in this browser (devtools' EDGE selector, the debug panel's storage driver). */
  settings: ConfigInit;
  /** Build-time config mapped from `dx-env.yml`. */
  envs: ConfigInit;
  local: ConfigInit;
  defaults: ConfigInit;
};

const edgeUrlOf = (source: ConfigInit): string | undefined => source.runtime?.services?.edge?.url || undefined;

/** The hub EDGE serves under `/hub`, the only one whose accounts that EDGE recognises. */
const hubBehind = (edgeUrl: string): string => `${edgeUrl.replace(/\/+$/, '')}/hub/`;

/**
 * Orders Composer's config sources, highest precedence first.
 *
 * Persisted settings outrank the build except for an EDGE the build pins (`DX_EDGE_BASE_URL`), since every
 * client of one deployment must share its EDGE: a guest redeems an invitation on the EDGE the host wrote it to.
 * Where a persisted selection does move EDGE, the hub (`DX_HUB_URL`) moves with it.
 */
export const orderConfigSources = ({ settings, envs, local, defaults }: ConfigSources): ConfigInit[] => {
  const pinnedEdgeUrl = edgeUrlOf(envs);
  const selectedEdgeUrl = pinnedEdgeUrl ? undefined : edgeUrlOf(settings);
  // Only a build with accounts names a hub; naming one for any other build would turn accounts on.
  const hasHub = [settings, envs, local, defaults].some(
    (source) => typeof source.runtime?.app?.env?.DX_HUB_URL === 'string',
  );
  return [
    {
      runtime: {
        ...(pinnedEdgeUrl ? { services: { edge: { url: pinnedEdgeUrl } } } : {}),
        ...(selectedEdgeUrl && hasHub ? { app: { env: { DX_HUB_URL: hubBehind(selectedEdgeUrl) } } } : {}),
      },
    },
    settings,
    envs,
    local,
    defaults,
  ];
};
