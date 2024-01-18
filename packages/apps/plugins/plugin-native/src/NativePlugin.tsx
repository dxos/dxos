//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { captureException } from '@dxos/sentry';

import meta from './meta';

export const NativePlugin = (): PluginDefinition => ({
  meta,
  ready: async (plugins) => {
    console.log('Native is ready');
  },
});
