//
// Copyright 2023 DXOS.org
//

import { PublishTestSpec } from './spec';
import { TestRunner } from './test-runner';

const main = async () => {
  const testSpec: PublishTestSpec = {
    appName: 'test-app',
    kubeEndpoint: 'testing.dxos.org',
    outDir: 'out/test-app',
    pubishDelayMs: 30_000,
    checksCount: 10,
    checksIntervalMs: 20_000
  };

  const testRunner = new TestRunner(testSpec);
  await testRunner.run();
};

void main();
