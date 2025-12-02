//
// Copyright 2024 DXOS.org
//

import browser from 'webextension-polyfill';

export const DEVELOPER_MODE_PROP = 'developer-mode';
export const SPACE_MODE_PROP = 'space-mode';
export const THUMBNAIL_PROP = 'thumbnail-url';
export const SPACE_ID_PROP = 'space-id';

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

export const getProp = async (prop: string): Promise<boolean> => {
  const storage = await browser.storage.sync.get(prop);
  return Boolean(storage?.[prop]);
};

export const getConfig = async (): Promise<Config> => {
  const devmode = Boolean(await getProp(DEVELOPER_MODE_PROP));
  return {
    devmode,
    chatAgentUrl: devmode ? DEV_CHAT_AGENT_URL : MAIN_CHAT_AGENT_URL,
    imageServiceUrl: devmode ? DEV_IMAGE_SERVICE_URL : MAIN_IMAGE_SERVICE_URL,
  };
};
