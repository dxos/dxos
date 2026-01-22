//
// Copyright 2025 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

import { meta } from '../meta';

import { integration } from './commands';

export const TokenManagerPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addCommandModule({
    commands: [integration],
  }),
  Plugin.make,
);
