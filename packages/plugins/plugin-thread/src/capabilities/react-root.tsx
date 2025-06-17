//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';

import { Call } from '../components';
import { THREAD_PLUGIN } from '../meta';

export default () => {
  return contributes(Capabilities.ReactRoot, {
    id: THREAD_PLUGIN,
    root: () => <Call.Audio />,
  });
};
