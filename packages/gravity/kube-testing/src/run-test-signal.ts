//
// Copyright 2023 DXOS.org
//

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { SignalServerRunner } from '@dxos/signal';
import { randomInt } from '@dxos/util';

const ports = new Set<number>();

export const runSignal = async (num: number, outFolder: string, signalArguments: string[]) => {
  let port = randomInt(10000, 20000);

  while (ports.has(port)) {
    log.warn(`port in use ${port}`);
    port = randomInt(10000, 20000);
  }

  ports.add(port);

  const pathToKubeRepo =
    {
      mykola: '/Users/mykola/Documents/dev/kube/',
      dmaretskyi: '/Users/dmaretskyi/Projects/kube/',
      nf: '/Users/nf/work/kube/',
      egorgripasov: '/Users/egorgripasov/Projects/dxos/kube',
    }[execSync('whoami').toString().trim()] ?? raise(new Error('Who are you?'));
  const BIN_PATH = './cmds/signal-test/main.go';

  {
    if (!fs.existsSync(pathToKubeRepo)) {
      throw new Error(`Kube repo not exists: ${pathToKubeRepo}`);
    }

    if (!fs.existsSync(path.join(pathToKubeRepo, BIN_PATH))) {
      throw new Error(`Bin not exists: ${path.join(pathToKubeRepo, BIN_PATH)}`);
    }
  }

  const runner = new SignalServerRunner({
    port: randomInt(10000, 20000),
    binCommand: `go run ${BIN_PATH}`,
    signalArguments,
    cwd: pathToKubeRepo,
    env: {
      GOLOG_FILE: `${outFolder}/signal-${num}.log`,
      GOLOG_OUTPUT: 'file',
      GOLOG_LOG_FMT: 'json',
      SIGNAL_PROTOCOL_VERSION: new Date().getTime().toString(),
    },
    shell: true,
  });
  await runner.waitUntilStarted();
  return runner;
};
