//
// Copyright 2024 DXOS.org
//

import { storeObservabilityGroup } from '@dxos/observability';

import { appKey } from './constants';

const run = async () => {
  await storeObservabilityGroup(appKey, 'dxos');
  window.location.pathname = '/';
  localStorage.setItem('dxos.org/shell/features/agentHosting', 'true');
};

void run();
