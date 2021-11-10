//
// Copyright 2021 DXOS.org
//

import { useMemo } from 'react';
import { browser } from 'webextension-polyfill-ts';

import { wrapPort } from '../../utils/wrapPort';

export const useExtensionPort = () => {
  return useMemo(() => wrapPort(browser.runtime.connect()), []);
};
