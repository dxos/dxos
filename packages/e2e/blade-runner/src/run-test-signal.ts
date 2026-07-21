//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { raise } from '@dxos/debug';

/**
 * Minimal signal-server handle shape. The KUBE signal server package (`@dxos/signal`) was removed;
 * `runSignal` remains a stub for the blade-runner spec surface and never actually spawns a server.
 */
export type SignalServerRunner = {
  waitUntilStarted(): Promise<void>;
  url(): string;
  stop(): Promise<void>;
};

// TODO(burdon): Also require config for dxos root.
const getKubeRepo = () => process.env.KUBE_HOME ?? raise(new Error('KUBE_HOME environment variable not set.'));

// Relative to KUBE repo.
const BIN_PATH = './cmds/signal-test/main.go';

export const runSignal = async (
  num: number,
  outFolder: string,
  signalArguments: string[],
  onError?: (err: any) => void,
): Promise<SignalServerRunner | undefined> => {
  if (typeof window === 'undefined' && !fs.existsSync(getKubeRepo())) {
    throw new Error(`Kube repo does not exist: ${getKubeRepo()}`);
  }

  if (typeof window === 'undefined' && !fs.existsSync(path.join(getKubeRepo(), BIN_PATH))) {
    throw new Error(`Bin does not exist: ${path.join(getKubeRepo(), BIN_PATH)}`);
  }

  // const runner = new SignalServerRunner({
  //   binCommand: `go run ${BIN_PATH}`,
  //   signalArguments,
  //   cwd: getKubeRepo(),
  //   env: {
  //     GOLOG_FILE: `${outFolder}/signal-${num}.log`,
  //     GOLOG_OUTPUT: 'file',
  //     GOLOG_LOG_FMT: 'json',
  //     SIGNAL_PROTOCOL_VERSION: new Date().getTime().toString(),
  //   },
  //   shell: true,
  //   onError,
  // });
  // await runner.waitUntilStarted();
  // return runner;
};
