//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CallArticle, CallDebugPanel, CallSidebar } from '#containers';
import { Call, CallsCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'activeCallCompanion',
        role: 'deck-companion--active-call',
        component: () => <CallSidebar />,
      }),
      Surface.create({
        id: 'devtoolsOverview',
        role: 'devtools-overview',
        component: () => {
          const call = useCapability(CallsCapabilities.Manager);
          const state = useAtomValue(call.stateAtom);
          return <CallDebugPanel state={state} />;
        },
      }),
      Surface.create({
        id: 'call',
        filter: AppSurface.object(AppSurface.Article, Call.Call),
        component: ({ role, data }) => (
          <CallArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
