//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CallArticle, CallDebugPanel, CallSidebar } from '#containers';

import * as CallsCapabilities from '../types/CallsCapabilities';

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
        component: CallSidebar,
      }),
      Surface.create({
        id: 'devtoolsOverview',
        filter: Surface.makeFilter(AppSurface.DevtoolsOverview),
        component: CallDebugPanel,
      }),
      // TODO(wittjosiah): Update to use a typed token exported from plugin-calls.
      Surface.create({
        id: 'call',
        filter: Surface.makeFilter(AppSurface.Article, isCallData),
        component: CallArticle,
        props: ({ data: { subject, attendableId } }) => ({ roomId: subject.roomId, attendableId }),
      }),
    ]),
  ),
);
