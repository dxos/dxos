//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import { ContextMenuRoot } from '../containers/ContextMenuRoot/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactRoot, {
      id: `${meta.profile.key}.context-menu`,
      root: () => <ContextMenuRoot />,
    }),
  ),
);
