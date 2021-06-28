//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

import { useBackgroundService } from '@dxos/wallet-core';

import { wrapPort } from '../utils/wrapPort';

export const useExtensionBackgroundService = () => {
  const backgroundService = useBackgroundService({ port: wrapPort(browser.runtime.connect()) });
  return backgroundService;
};
