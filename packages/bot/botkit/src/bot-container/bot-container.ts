//
// Copyright 2021 DXOS.org
//

import { ReadOnlyEvent } from '@dxos/async';
import { RpcPort } from '@dxos/rpc';

import { BotPackageSpecifier } from '../proto/gen/dxos/bot';

export interface SpawnOptions {
  localPath: string;
  id: string;
  logFilePath?: string;
}

export interface BotExitStatus {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface BotContainer {
  error: ReadOnlyEvent<[id: string, error: Error]>;
  exited: ReadOnlyEvent<[id: string, status: BotExitStatus]>;

  spawn(opts: SpawnOptions): Promise<RpcPort>;
  kill(id: string): Promise<void>;
  killAll(): void;
}
