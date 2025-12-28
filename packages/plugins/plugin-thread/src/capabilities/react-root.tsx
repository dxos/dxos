//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';

import { Call } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() => {
  return Capability.contributes(Capabilities.ReactRoot, {
    id: meta.id,
    root: () => <Call.Audio />,
  });
});
