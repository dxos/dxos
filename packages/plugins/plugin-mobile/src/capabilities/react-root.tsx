//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { useDismissToast } from '@dxos/plugin-deck/hooks';

import { MobileDeckLayout } from '#containers';
import { meta } from '#meta';

export const ReactRoot = AppCapability.reactRoot(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.ReactRoot, {
      id: meta.profile.key,
      root: () => {
        const handleDismissToast = useDismissToast();

        return <MobileDeckLayout onDismissToast={handleDismissToast} />;
      },
    });
  }),
);
