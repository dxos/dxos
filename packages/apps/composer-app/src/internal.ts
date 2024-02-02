//
// Copyright 2024 DXOS.org
//

import { storeObservabilityGroup } from '@dxos/observability';

import { appKey } from './constants';

const run = async () => {
  await storeObservabilityGroup(appKey, 'dxos');
  window.location.pathname = '/';
};

void run();
