//
// Copyright 2023 DXOS.org
//

import { type PluginDefinition } from '@dxos/app-framework';

import meta from './meta';

export const HelpPlugin = (): PluginDefinition => {
  return {
    meta,
    provides: {},
  };
};
