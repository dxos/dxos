//
// Copyright 2023 DXOS.org
//

import { Daemon, ProcessDescription } from '../daemon';

export class ForeverDaemon implements Daemon {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isRunning: (profile?: string) => Promise<boolean>;

  start: (profile?: string | undefined) => Promise<ProcessDescription>;
  stop: (profile?: string | undefined) => Promise<ProcessDescription>;
  restart: (profile?: string | undefined) => Promise<ProcessDescription>;
  list: () => Promise<ProcessDescription[]>;
}
