//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { CallArticle, CallDebugPanel, CallSidebar } from '#containers';
import { CallsCapabilities } from '#types';

type CallRoomData = { subject: CallsCapabilities.Call; attendableId: string | undefined };

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
      // TODO(wittjosiah): Update to use a typed token exported from plugin-calls.
      Surface.create({
        id: 'call',
        filter: { bindings: [{ role: 'article', guard: (data): data is CallRoomData => typeof (data as Record<string, unknown>).subject === 'object' && typeof ((data as Record<string, unknown>).subject as Record<string, unknown>).roomId === 'string' }] },
        component: ({ data }) => <CallArticle roomId={data.subject.roomId} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
