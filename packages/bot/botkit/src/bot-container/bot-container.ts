//
// Copyright 2021 DXOS.org
//

import { BotHandle } from '../bot-handle';
import { BotPackageSpecifier } from '../proto/gen/dxos/bot';

export interface BotContainer {
  spawn: (pkg: BotPackageSpecifier) => Promise<BotHandle>
  killAll: () => void
}
