//
// Copyright 2021 DXOS.org
//

import { createWindowMessagePort } from '@dxos/wallet-core';
import { useBackgroundService } from '@dxos/wallet-core';

export const useContentScript = () => {
  return useBackgroundService({ port: createWindowMessagePort() });
};