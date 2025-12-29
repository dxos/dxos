//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';

import { Call } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() => {
  return Capability.contributes(Common.Capability.ReactRoot, {
    id: meta.id,
    root: () => <Call.Audio />,
  });
});
