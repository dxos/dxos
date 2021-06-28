//
// Copyright 2021 DXOS.org
//

import { useBackgroundService } from '@dxos/wallet-core';
import { browser } from 'webextension-polyfill-ts';
import { wrapPort } from '../utils/wrapPort';

export const useExtensionToBackground = () => {
  const backgroundService = useBackgroundService({ port: wrapPort(browser.runtime.connect()) });
  return backgroundService;
};