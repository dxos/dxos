//
// Copyright 2023 DXOS.org
//

export type ProcessDescription = { profile?: string; pid?: number; isRunning?: boolean };

export interface Daemon {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  isRunning: (profile: string) => Promise<boolean>;

  start: (profile: string) => Promise<ProcessDescription>;
  stop: (profile: string) => Promise<ProcessDescription>;
  restart: (profile: string) => Promise<ProcessDescription>;

  list: () => Promise<ProcessDescription[]>;
}
