//
// Copyright 2023 DXOS.org
//

import { Config, Defaults, Envs, Local, resolveTelemetryTag } from '@dxos/config';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';

import { LOG_STORE_DB_NAME } from './constants.ts';

let capturingLogs = false;

export const getConfig = async () => {
  const config = new Config(await Envs(), Local(), Defaults());
  // The tab serves the WebRTC bridge, so its half of a connection is only visible here.
  if (!capturingLogs && resolveTelemetryTag(config) === 'e2e') {
    capturingLogs = true;
    log.addProcessor(new IdbLogStore({ dbName: LOG_STORE_DB_NAME }).processor);
  }
  return config;
};
