//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { SignalServerRunner } from '@dxos/signal';
import { randomInt } from '@dxos/util';

// TODO(burdon): Also require config for dxos root.
const KUBE_REPO = process.env.KUBE_HOME ?? raise(new Error('KUBE_HOME environment variable not set.'));

// Relative to KUBE repo.
const BIN_PATH = './cmds/signal-test/main.go';

{
  if (!fs.existsSync(KUBE_REPO)) {
    throw new Error(`Kube repo does not exist: ${KUBE_REPO}`);
  }

  if (!fs.existsSync(path.join(KUBE_REPO, BIN_PATH))) {
    throw new Error(`Bin does not exist: ${path.join(KUBE_REPO, BIN_PATH)}`);
  }
}

const ports = new Set<number>();

export const runSignal = async (num: number, outFolder: string, signalArguments: string[]) => {
  let port = randomInt(10_000, 20_000);
  while (ports.has(port)) {
    log.warn(`port in use ${port}`);
    port = randomInt(10_000, 20_000);
  }

  ports.add(port);

  try {
    log('starting signal server', { port });
    const runner = new SignalServerRunner({
      port: randomInt(10_000, 20_000),
      binCommand: `go run ${BIN_PATH}`,
      signalArguments,
      cwd: KUBE_REPO,
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
  } catch (err) {
    throw new Error('Failed to start signal server.');
  }
};
