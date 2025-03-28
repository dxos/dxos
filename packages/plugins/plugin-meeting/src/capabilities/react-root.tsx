//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes } from '@dxos/app-framework';

import { Call } from '../components/Call';
import { MEETING_PLUGIN } from '../meta';

export default () => {
  return contributes(Capabilities.ReactRoot, {
    id: MEETING_PLUGIN,
    root: () => <Call.Audio />,
  });
};
