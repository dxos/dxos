//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { raise } from '@dxos/debug';
import { SignalServerRunner } from '@dxos/signal';

// TODO(burdon): Also require config for dxos root.
const KUBE_REPO = process.env.KUBE_HOME ?? raise(new Error('KUBE_HOME environment variable not set.'));

// Relative to KUBE repo.
const BIN_PATH = './cmds/signal-test/main.go';

{
  if (typeof window === 'undefined' && !fs.existsSync(KUBE_REPO)) {
    throw new Error(`Kube repo does not exist: ${KUBE_REPO}`);
  }

  if (typeof window === 'undefined' && !fs.existsSync(path.join(KUBE_REPO, BIN_PATH))) {
    throw new Error(`Bin does not exist: ${path.join(KUBE_REPO, BIN_PATH)}`);
  }
}

export const runSignal = async (
  num: number,
  outFolder: string,
  signalArguments: string[],
  onError?: (err: any) => void,
) => {
  const runner = new SignalServerRunner({
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
    onError,
  });
  await runner.waitUntilStarted();
  return runner;
};
