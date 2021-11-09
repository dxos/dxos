//
// Copyright 2021 DXOS.org
//

import { createWindowMessagePort } from '@dxos/client';
import { useBackgroundService } from '@dxos/wallet-core';

export const useContentScript = () => {
  return useBackgroundService({ port: createWindowMessagePort() });
};
