//
// Copyright 2024 DXOS.org
//

import rev from 'git-rev-sync';

import { initializeNodeObservability, type Observability } from '@dxos/observability';

let observability: Observability | undefined;

export const initBladeRunnerObservability = async () => {
  observability = await initializeNodeObservability({
    namespace: 'blade-runner',
    installationId: 'blade-runner',
    version: '1',
  });

  await observability.initialize();
  observability.startErrorLogs();

  observability.setTag('commit_hash', rev.long());
};

export const flushObservability = async () => {
  await observability?.flush();
};
