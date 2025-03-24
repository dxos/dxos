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
          queue: randomQueueDxn().toString(), // TODO(burdon): Associate with space.
          name: name ?? `Transcript ${getTimeStr(Date.now())}`,
        });

        return { data: { object: transcript } };
      },
    }),

    createResolver({
      intent: TranscriptionAction.Summarize,
      resolve: () => {
        // TODO(burdon): Trigger summary generation.
      },
    }),
  ]);
