//
// Copyright 2022 DXOS.org
//

import { initializeAppObservability } from '@dxos/observability';

import { setupConfig } from './config';
import { appKey } from './constants';

onconnect = async (event) => {
  // All worker code & imports have been moved behind an async import due to WASM + top-level await breaking the connect even somehow.
  // See: https://github.com/Menci/vite-plugin-wasm/issues/37
  const { onconnect } = await import('@dxos/client/worker');
  await onconnect(event);
};

const init = async () => {
  const config = await setupConfig();
  await initializeAppObservability({ namespace: appKey, config });
};

void init();
