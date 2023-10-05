//
// Copyright 2023 DXOS.org
//

export type StartOptions = {
  profile: string;
  errFile: string;
  logFile: string;
};

export interface Runner {
  start(options: StartOptions): Promise<void>;
  stop(profile: string, force: boolean): Promise<void>;
  isRunning(profile: string): Promise<boolean>;
}
