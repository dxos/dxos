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
import { CallsCapabilities } from '#types';

const CallRoom = CallsCapabilities.ArticleSurface;

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'activeCallCompanion',
        role: 'deck-companion--activeCall',
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
        filter: AppSurface.predicate(CallRoom, (data) => typeof data.subject?.roomId === 'string'),
        component: ({ data }) => <CallArticle roomId={data.subject.roomId} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
