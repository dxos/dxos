//
// Copyright 2023 DXOS.org
//

export type ProcessInfo = {
  profile?: string;
  pid?: number;
  running?: boolean;
  started?: number;
  logFile?: string;
};

export type StartOptions = {
  config?: string;
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
  restart: (profile: string, options?: StartOptions) => Promise<ProcessInfo>;
  stop: (profile: string, options?: { force?: boolean }) => Promise<ProcessInfo | undefined>;

  isRunning: (profile: string) => Promise<boolean>;
  list: () => Promise<ProcessInfo[]>;
}
