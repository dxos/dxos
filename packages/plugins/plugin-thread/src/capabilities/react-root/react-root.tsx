//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import React from 'react';


import { Capability, Common } from '@dxos/app-framework';


import { Call } from '../../components';

import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.sync(() => {
  return Capability.contributes(Common.Capability.ReactRoot, {
    id: meta.id,
    root: () => <Call.Audio />,
  });
  }),
);
