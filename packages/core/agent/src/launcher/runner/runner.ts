//
// Copyright 2023 DXOS.org
//

import type { ProcessInfo, StartOptions } from '../../daemon';

export type RunnerStartOptions = {
  profile: string;
  errFile: string;
  logFile: string;
  daemonOptions?: StartOptions;
};

export interface Runner {
  start(options: RunnerStartOptions): Promise<void>;
  stop(profile: string, force: boolean): Promise<void>;
  isRunning(profile: string): Promise<boolean>;
  info(profile: string): Promise<ProcessInfo>;
}
