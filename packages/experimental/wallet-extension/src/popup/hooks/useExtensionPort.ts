//
// Copyright 2021 DXOS.org
//

import { useMemo } from 'react';
import browser from 'webextension-polyfill';

import { wrapPort } from '../../utils/wrapPort';

export const useExtensionPort = () => useMemo(() => wrapPort(browser.runtime.connect()), []);
