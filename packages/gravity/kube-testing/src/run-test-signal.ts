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

const PATH_TO_KUBE_REPO =
  {
    mykola: '/Users/mykola/Documents/dev/kube/',
    dmaretskyi: '/Users/dmaretskyi/Projects/kube/',
    nf: '/Users/nf/work/kube/',
    egorgripasov: '/Users/egorgripasov/Projects/dxos/kube',
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

const ports = new Set<number>();

export const runSignal = async (num: number, outFolder: string, signalArguments: string[]) => {
  let port = randomInt(10000, 20000);

  while (ports.has(port)) {
    log.warn(`port in use ${port}`);
    port = randomInt(10000, 20000);
  }

  ports.add(port);

  const runner = new SignalServerRunner({
    port: randomInt(10000, 20000),
    binCommand: `go run ${BIN_PATH}`,
    signalArguments,
    cwd: PATH_TO_KUBE_REPO,
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
