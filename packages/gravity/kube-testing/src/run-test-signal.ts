//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { SignalServerRunner } from '@dxos/signal';
import { randomInt } from '@dxos/util';

// const PATH_TO_KUBE_REPO = '/Users/mykola/Documents/dev/kube/';
const PATH_TO_KUBE_REPO = '/Users/dmaretskyi/Projects/kube/';
const BIN_PATH = './cmds/signal-test/main.go';
// const PATH_TO_KUBE_REPO = '/Users/mykola/Documents/dev/dxos/packages/gravity/kube-testing/src/';
// const binPath = 'hello-world.go';

{
  if (!fs.existsSync(PATH_TO_KUBE_REPO)) {
    throw new Error(`Kube repo not exists: ${PATH_TO_KUBE_REPO}`);
  }

  if (!fs.existsSync(path.join(PATH_TO_KUBE_REPO, BIN_PATH))) {
    throw new Error(`Bin not exists: ${path.join(PATH_TO_KUBE_REPO, BIN_PATH)}`);
  }
}

export const runSignal = async () => {
  const runner = new SignalServerRunner({
    port: randomInt(10000, 20000),
    binCommand: `go run ${BIN_PATH}`,
    signalArguments: ['p2pserver',],
    cwd: PATH_TO_KUBE_REPO
  });
  await runner.waitUntilStarted();
  return runner;
};
