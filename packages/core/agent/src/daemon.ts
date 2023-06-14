//
// Copyright 2023 DXOS.org
//

export type ProcessDescription = { profile?: string; pid?: number; isRunning?: boolean };

/**
 * Manages life cycle of agent processes.
 */
export interface Daemon {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  start: (profile: string) => Promise<ProcessDescription>;
  stop: (profile: string) => Promise<ProcessDescription>;
  restart: (profile: string) => Promise<ProcessDescription>;

  isRunning: (profile: string) => Promise<boolean>;
  list: () => Promise<ProcessDescription[]>;
}
