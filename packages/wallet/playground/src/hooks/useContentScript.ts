//
// Copyright 2021 DXOS.org
//

import { createWindowMessagePort, useBackgroundService } from '@dxos/wallet-core';

export const useContentScript = () => {
  return useBackgroundService({ port: createWindowMessagePort() });
};
