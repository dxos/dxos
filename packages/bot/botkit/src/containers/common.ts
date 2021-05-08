//
// Copyright 2020 DXOS.org
//

import { ReadOnlyEvent } from '@dxos/util';

import { BotId, BotInfo } from '../bot-manager';

export interface ContainerStartOptions {
  controlTopic: Buffer
}

export interface BotExitEventArgs {
  botId: BotId
  exitCode: number
}

export interface BotContainer {
  /**
   * Start container.
   */
  start(options: ContainerStartOptions): Promise<void>

  /**
   * Stop container.
   */
  stop(): Promise<void>;

  botExit: ReadOnlyEvent<BotExitEventArgs>;

  /**
   * Start bot instance.
   */
  startBot (botInfo: BotInfo): Promise<void>;

  /**
   * Stop bot instance.
   */
  stopBot (botInfo: BotInfo): Promise<void>
}
