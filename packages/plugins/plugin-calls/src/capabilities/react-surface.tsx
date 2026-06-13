//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Channel } from '@dxos/types';

import { CallArticle, CallDebugPanel, CallSidebar, CallsList } from '#containers';
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
      Surface.create({
        id: 'callCompanion',
        role: 'article',
        filter: (data): data is { subject: Call.Call | 'call'; companionTo: Channel.Channel } =>
          (Obj.instanceOf(Call.Call, data.subject) || data.subject === 'call') &&
          Obj.instanceOf(Channel.Channel, data.companionTo),
        component: ({ role, data }) => {
          return data.subject === 'call' ? (
            <CallsList companionTo={data.companionTo} />
          ) : (
            <CallArticle role={role} subject={data.subject} />
          );
        },
      }),
    ]),
  ),
);
