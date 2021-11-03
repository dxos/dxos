//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';

import { BotFactoryService } from '../proto/gen/dxos/bot';

export class BotController {
  constructor (private _botFactory: BotFactoryService, private _port: RpcPort) {}
  async start (): Promise<void> {}
}
