//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { MeetingAction, MeetingType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MeetingAction.Create,
      resolve: ({ transcript, ...rest }) => {
        const doc = create(MeetingType, {
          transcript,
          ...rest,
        });

        return { data: { object: doc } };
      },
    }),
  ]);
