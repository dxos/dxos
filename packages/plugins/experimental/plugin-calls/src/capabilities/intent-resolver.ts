//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { CallsAction, TranscriptType } from '../types';
import { getTimeStr, randomQueueDxn } from '../utils';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: CallsAction.Create,
      resolve: ({ name }) => {
        const transcript = create(TranscriptType, {
          name: name ?? `Transcript ${getTimeStr(Date.now())}`,
          queue: randomQueueDxn().toString(),
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
