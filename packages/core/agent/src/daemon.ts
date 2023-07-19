//
// Copyright 2023 DXOS.org
//

export type ProcessInfo = {
  profile?: string;
  pid?: number;
  running?: boolean;
  started?: number;
};

/**
 * Manages life cycle of agent processes.
 */
export interface Daemon {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  start: (profile: string) => Promise<ProcessInfo>;
  stop: (profile: string, params?: { force?: boolean }) => Promise<ProcessInfo>;
  restart: (profile: string) => Promise<ProcessInfo>;

  isRunning: (profile: string) => Promise<boolean>;
  list: () => Promise<ProcessInfo[]>;
}
