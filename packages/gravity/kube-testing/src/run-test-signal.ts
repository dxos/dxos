//
// Copyright 2023 DXOS.org
//

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { raise } from '@dxos/debug';
import { SignalServerRunner } from '@dxos/signal';
import { randomInt } from '@dxos/util';

const PATH_TO_KUBE_REPO =
  {
    mykola: '/Users/mykola/Documents/dev/kube/',
    dmaretskyi: '/Users/dmaretskyi/Projects/kube/'
  }[execSync('whoami').toString().trim()] ?? raise(new Error('Who are you?'));
const BIN_PATH = './cmds/signal-test/main.go';

{
  if (!fs.existsSync(PATH_TO_KUBE_REPO)) {
    throw new Error(`Kube repo not exists: ${PATH_TO_KUBE_REPO}`);
  }

  if (!fs.existsSync(path.join(PATH_TO_KUBE_REPO, BIN_PATH))) {
    throw new Error(`Bin not exists: ${path.join(PATH_TO_KUBE_REPO, BIN_PATH)}`);
  }
}

export const runSignal = async (num: number, outFolder: string) => {
  const runner = new SignalServerRunner({
    port: randomInt(10000, 20000),
    binCommand: `go run -gcflags="all=-N -l" ${BIN_PATH}`,
    signalArguments: [
      // 'p2pserver'
      'globalsubserver'
    ],
    cwd: PATH_TO_KUBE_REPO,
    env: {
      GOLOG_FILE: `${outFolder}/signal-${num}.log`,
      GOLOG_OUTPUT: 'file',
      GOLOG_LOG_FMT: 'json'
    },
    shell: true
  });
  await runner.waitUntilStarted();
  return runner;
};
