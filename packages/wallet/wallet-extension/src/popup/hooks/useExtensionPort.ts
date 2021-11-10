//
// Copyright 2021 DXOS.org
//

import { browser } from 'webextension-polyfill-ts';

import { wrapPort } from '../../utils/wrapPort';
import { useMemo } from 'react';

export const useExtensionPort = () => {
  return useMemo(() => wrapPort(browser.runtime.connect()), []);
};
