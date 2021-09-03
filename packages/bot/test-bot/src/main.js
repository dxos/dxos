//
// Copyright 2021 DXOS.org
//

import { Bot, getConfig } from '@dxos/bot';

if (!module.parent) {
  void new Bot(getConfig()).start();
}
