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

type CallRoomData = { subject: CallsCapabilities.Call; attendableId: string };

const isCallData = (data: unknown): data is CallRoomData => {
  const subject = (data as Record<string, unknown>)?.subject;
  return typeof subject === 'object' && typeof (subject as Record<string, unknown>)?.roomId === 'string';
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'activeCallCompanion',
        filter: Surface.makeFilter(AppSurface.deckCompanion('activeCall')),
        component: () => <CallSidebar />,
      }),
      Surface.create({
        id: 'devtoolsOverview',
        filter: Surface.makeFilter(AppSurface.DevtoolsOverview),
        component: () => {
          const call = useCapability(CallsCapabilities.Manager);
          const state = useAtomValue(call.stateAtom);
          return <CallDebugPanel state={state} />;
        },
      }),
      // TODO(wittjosiah): Update to use a typed token exported from plugin-calls.
      Surface.create({
        id: 'call',
        filter: Surface.makeFilter(AppSurface.Article, isCallData),
        component: ({ data }) => <CallArticle roomId={data.subject.roomId} attendableId={data.attendableId} />,
      }),
    ]),
  ),
);
