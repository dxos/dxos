//
// Copyright 2024 DXOS.org
//

import browser from 'webextension-polyfill';

export const HOME_URL = 'https://labs.composer.space';

export const DEVELOPER_MODE_PROP = 'developer-mode';
export const THUMBNAIL_PROP = 'thumbnail-url';

const DEV_IMAGE_SERVICE_URL = 'http://localhost:8787';
const MAIN_IMAGE_SERVICE_URL = 'https://image-service-main.dxos.workers.dev';
export const IMAGE_SERVICE_THUMBNAIL_ENDPOINT = '/thumbnail';

export type Config = {
  devmode: boolean;
  imageServiceUrl: string;
};

export const getConfig = async (): Promise<Config> => {
  const storage = await browser.storage.sync.get(DEVELOPER_MODE_PROP);
  const devmode = Boolean(storage?.[DEVELOPER_MODE_PROP]);
  return {
    devmode,
    imageServiceUrl: devmode ? DEV_IMAGE_SERVICE_URL : MAIN_IMAGE_SERVICE_URL,
  };
};
