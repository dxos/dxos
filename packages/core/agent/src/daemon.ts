//
// Copyright 2023 DXOS.org
//

export type ProcessInfo = {
  profile?: string;
  pid?: number;
  running?: boolean;
  started?: number;
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
  start: (profile: string, opts?: StartOptions) => Promise<ProcessInfo>;
  stop: (profile: string, opts?: { force?: boolean }) => Promise<ProcessInfo>;
  restart: (profile: string, opts?: StartOptions) => Promise<ProcessInfo>;

  isRunning: (profile: string) => Promise<boolean>;
  list: () => Promise<ProcessInfo[]>;
}
