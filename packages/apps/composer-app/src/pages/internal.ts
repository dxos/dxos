//
// Copyright 2024 DXOS.org
//

import * as Observability from '@dxos/observability/Observability';

import { APP_KEY } from '../util';

const run = async () => {
  const searchProps = new URLSearchParams(window.location.search);
  await Observability.storeObservabilityGroup(APP_KEY, searchProps.get('observabilityGroup') ?? 'dxos');
  window.location.pathname = '/';
  localStorage.setItem('org.dxos.shell.features.agentHosting', 'true');
};

void run();
