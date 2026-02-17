//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { meta } from '../meta';

import { integration } from './commands';

export const TokenManagerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addCommandModule({
    commands: [integration],
  }),
  Plugin.make,
);
