//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, defineCapabilityModule } from '@dxos/app-framework';

import { Call } from '../components';
import { meta } from '../meta';

export default defineCapabilityModule(() => {
  return contributes(Capabilities.ReactRoot, {
    id: meta.id,
    root: () => <Call.Audio />,
  });
});
