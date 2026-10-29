//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { ContextMenuRoot } from '../containers/ContextMenuRoot/index.ts';
import { NavTreeNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactRoot, {
      id: `${NavTreeNamespace.key}.context-menu`,
      root: () => <ContextMenuRoot />,
    }),
  ),
);
