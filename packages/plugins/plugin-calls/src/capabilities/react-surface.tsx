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

/**
 * Article-role surface for a call, identified by `roomId` rather than an ECHO object: the live
 * session is runtime state owned by `CallManager`, so the call panel needs only the room to join.
 */
type CallRoomData = { attendableId: string; roomId: string };
const CallRoom: Surface.RoleToken<CallRoomData> = Surface.makeType('article');

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
        filter: AppSurface.predicate(CallRoom, (data) => typeof data.roomId === 'string'),
        component: ({ data }) => <CallArticle roomId={data.roomId} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
