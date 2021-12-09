//
// Copyright 2021 DXOS.org
//

import { RpcPort } from '@dxos/rpc';
import { BotPackageSpecifier } from '../proto/gen/dxos/bot';

export interface BotContainer {
  spawn: (pkg: BotPackageSpecifier, id: string) => Promise<RpcPort>
  killAll: () => void
}
