//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { TranscriptionAction, TranscriptType } from '../types';
import { getTimeStr, randomQueueDxn } from '../util';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptionAction.Create,
      resolve: ({ name }) => {
        const transcript = create(TranscriptType, {
          name: name ?? `Transcript ${getTimeStr(Date.now())}`,
          queue: randomQueueDxn().toString(),
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
