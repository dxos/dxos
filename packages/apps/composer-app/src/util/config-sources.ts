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

/**
 * Orders Composer's config sources, highest precedence first.
 *
 * Persisted settings outrank the build except for an EDGE the build pins (`DX_EDGE_BASE_URL`), since every
 * client of one deployment must share its EDGE: a guest redeems an invitation on the EDGE the host wrote it to.
 */
export const orderConfigSources = ({ settings, envs, local, defaults }: ConfigSources): ConfigInit[] => {
  const pinnedEdgeUrl = envs.runtime?.services?.edge?.url;
  return [
    pinnedEdgeUrl ? { runtime: { services: { edge: { url: pinnedEdgeUrl } } } } : {},
    settings,
    envs,
    local,
    defaults,
  ];
};
