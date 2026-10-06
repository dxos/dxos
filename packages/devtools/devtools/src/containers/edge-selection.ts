//
// Copyright 2026 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { type ConfigInit } from '@dxos/config';

/**
 * The settings to persist when `edgeUrl` is picked in the EDGE selector, given the persisted `settings`.
 *
 * The hub entry moves with EDGE because EDGE checks accounts against the hub it serves under `/hub`. Only config
 * entries are written: `runtime.app.env` holds the build's environment, which a runtime selection must not rewrite.
 */
export const selectEdge = (settings: ConfigInit, edgeUrl: string): ConfigInit =>
  defaultsDeep(
    { runtime: { services: { edge: { url: edgeUrl }, hub: { url: `${edgeUrl.replace(/\/+$/, '')}/hub/` } } } },
    settings,
  );
