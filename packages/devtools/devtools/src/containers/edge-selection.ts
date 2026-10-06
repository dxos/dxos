//
// Copyright 2026 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { type Config, type ConfigInit, getEnvString } from '@dxos/config';

/**
 * The settings to persist when `edgeUrl` is picked in the EDGE selector, given the persisted `settings`.
 *
 * The hub moves with EDGE because EDGE checks accounts against the hub it serves under `/hub`. Build-env keys are
 * rewritten only where `config` already has them, since the presence of `DX_HUB_URL` is what turns accounts on.
 */
export const selectEdge = (settings: ConfigInit, config: Config, edgeUrl: string): ConfigInit => {
  const baseUrl = `${edgeUrl.replace(/\/+$/, '')}/`;
  const hubUrl = `${baseUrl}hub/`;
  const env: Record<string, string> = {};
  if (getEnvString(config, 'DX_HUB_URL') !== undefined) {
    env.DX_HUB_URL = hubUrl;
  }
  // The config panel lists `runtime.app.env`, so its EDGE entry moves too, though nothing reads it at runtime.
  if (getEnvString(config, 'DX_EDGE_BASE_URL') !== undefined) {
    env.DX_EDGE_BASE_URL = baseUrl;
  }

  return defaultsDeep(
    {
      runtime: {
        services: { edge: { url: edgeUrl }, hub: { url: hubUrl } },
        ...(Object.keys(env).length > 0 ? { app: { env } } : {}),
      },
    },
    settings,
  );
};
