//
// Copyright 2023 DXOS.org
//

export type ProcessInfo = {
  profile?: string;
  pid?: number;
  running?: boolean;
  restarts?: number;
  started?: number;
  logFile?: string;
  locked?: boolean;
};

export type StartOptions = {
  config?: string;
  metrics?: boolean;
  ws?: number;
  timeout?: number;
};

export type StopOptions = {
  force?: boolean;
};

/**
 * Manages life cycle of agent processes.
 */
export interface Daemon {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  /**
   * Start agent.
   * @param params.config Path to config file.
   */
  start: (profile: string, options?: StartOptions) => Promise<ProcessInfo>;
  restart: (profile: string, options?: StartOptions & StopOptions) => Promise<ProcessInfo>;
  stop: (profile: string, options?: StopOptions) => Promise<ProcessInfo | undefined>;

  isRunning: (profile: string) => Promise<boolean>;
  list: () => Promise<ProcessInfo[]>;
}
