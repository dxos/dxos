//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { Surface, useCapability } from '@dxos/app-framework/ui';

import { CallDebugPanel, CallSidebar } from '#containers';
import { CallsCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.calls.surface.activeCallCompanion'),
        role: 'deck-companion--active-call',
        component: () => <CallSidebar />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.calls.surface.devtoolsOverview'),
        role: 'devtools-overview',
        component: () => {
          const call = useCapability(CallsCapabilities.Manager);
          const state = useAtomValue(call.stateAtom);
          return <CallDebugPanel state={state} />;
        },
      }),
    ]),
  ),
);
