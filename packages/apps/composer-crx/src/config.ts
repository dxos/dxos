//
// Copyright 2024 DXOS.org
//

import browser from 'webextension-polyfill';

export const HOME_URL = 'https://labs.composer.space';

export const DEVELOPER_MODE_PROP = 'developer-mode';
export const THUMBNAIL_PROP = 'thumbnail-url';

const DEV_CHAT_AGENT_URL = 'ws://localhost:8791';
const MAIN_CHAT_AGENT_URL = 'wss://chat-agent-main.dxos.workers.dev';

const DEV_IMAGE_SERVICE_URL = 'http://localhost:8787';
const MAIN_IMAGE_SERVICE_URL = 'https://image-service-main.dxos.workers.dev';

export type Config = {
  devmode: boolean;
  chatAgentUrl: string;
  imageServiceUrl: string;
};

export const getConfig = async (): Promise<Config> => {
  const storage = await browser.storage.sync.get(DEVELOPER_MODE_PROP);
  const devmode = Boolean(storage?.[DEVELOPER_MODE_PROP]);
  return {
    devmode,
    chatAgentUrl: devmode ? DEV_CHAT_AGENT_URL : MAIN_CHAT_AGENT_URL,
    imageServiceUrl: devmode ? DEV_IMAGE_SERVICE_URL : MAIN_IMAGE_SERVICE_URL,
  };
};
