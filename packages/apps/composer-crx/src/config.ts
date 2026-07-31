//
// Copyright 2024 DXOS.org
//

// Deep import (not the `./core` barrel) so this module — reachable from lean contexts — does not
// pull background-only weight (e.g. the edge-client-backed `image` action).
import { DeveloperMode } from './core/state';
import { debugLog } from './debug-log';

export const HOME_URL = 'https://labs.composer.space';

const DEV_CHAT_AGENT_URL = 'ws://localhost:8791';
const MAIN_CHAT_AGENT_URL = 'wss://chat-agent-labs.dxos.workers.dev';

const DEV_IMAGE_SERVICE_URL = 'http://localhost:8790';
const MAIN_IMAGE_SERVICE_URL = 'https://image-service-main.dxos.workers.dev';

export type Config = {
  devmode: boolean;
  chatAgentUrl: string;
  imageServiceUrl: string;
};

/** Resolve the runtime config; service endpoints switch to local dev servers in developer mode. */
export const getConfig = async (): Promise<Config> => {
  const devmode = await DeveloperMode.get();
  const config = {
    devmode,
    chatAgentUrl: devmode ? DEV_CHAT_AGENT_URL : MAIN_CHAT_AGENT_URL,
    imageServiceUrl: devmode ? DEV_IMAGE_SERVICE_URL : MAIN_IMAGE_SERVICE_URL,
  };
  debugLog('config', config);
  return config;
};
