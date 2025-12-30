//
// Copyright 2024 DXOS.org
//

import { storeObservabilityGroup } from '@dxos/observability';

import { APP_KEY } from './constants';

const run = async () => {
  const searchProps = new URLSearchParams(window.location.search);
  await storeObservabilityGroup(APP_KEY, searchProps.get('observabilityGroup') ?? 'dxos');
  window.location.pathname = '/';
  localStorage.setItem('dxos.org/shell/features/agentHosting', 'true');
};

void run();
