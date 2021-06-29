//
// Copyright 2021 DXOS.org
//

import { createWindowMessagePort } from '@dxos/wallet-core';
import { useBackgroundService } from '@dxos/wallet-core';

export const useContentScript = () => {
  const backgroundService = useBackgroundService({ port: createWindowMessagePort() });
  return backgroundService;
};