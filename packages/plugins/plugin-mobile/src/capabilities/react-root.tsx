//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Hooks from '@dxos/plugin-deck/Hooks';

import { MobileDeckLayout } from '#containers';

import { MobileNamespace } from '../namespace.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.ReactRoot, {
      id: MobileNamespace.key,
      root: () => {
        const handleDismissToast = Hooks.useDismissToast();

        return <MobileDeckLayout onDismissToast={handleDismissToast} />;
      },
    });
  }),
);
