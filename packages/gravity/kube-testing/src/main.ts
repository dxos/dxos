//
// Copyright 2023 DXOS.org
//
import path from 'node:path';

import { SignalServerRunner } from '@dxos/signal';
import { randomInt } from '@dxos/util';

const PATH_TO_KUBE_REPO = '/Users/mykola/Documents/dev/kube/';

const startSignalServer = async () => {
  debugger;
  const binPath = path.join(PATH_TO_KUBE_REPO, 'cmds/signal/signal-test/main.go');
  const signalRunner = new SignalServerRunner({
    binCommand: `go run ${binPath}`,
    signalArguments: ['p2pserver'],
    port: randomInt(10000, 50000)
  });
  await signalRunner.waitUntilStarted();
  return signalRunner;
};

await startSignalServer();
