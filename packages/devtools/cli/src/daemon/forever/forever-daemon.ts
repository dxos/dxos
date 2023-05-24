//
// Copyright 2023 DXOS.org
//

import { Daemon, ProcessDescription } from '../daemon';

export class ForeverDaemon implements Daemon {
  connect(): Promise<void> {
    throw new Error('not implemented');
  }

  disconnect(): Promise<void> {
    throw new Error('not implemented');
  }

  isRunning(profile?: string): Promise<boolean> {
    throw new Error('not implemented');
  }

  start(profile?: string | undefined): Promise<ProcessDescription> {
    throw new Error('not implemented');
  }

  stop(profile?: string | undefined): Promise<ProcessDescription> {
    throw new Error('not implemented');
  }

  restart(profile?: string | undefined): Promise<ProcessDescription> {
    throw new Error('not implemented');
  }

  list(): Promise<ProcessDescription[]> {
    throw new Error('not implemented');
  }
}
