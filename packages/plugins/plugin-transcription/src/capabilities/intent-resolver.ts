//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginContext } from '@dxos/app-framework';
import { live, refFromDXN } from '@dxos/live-object';
import { type SpaceId, createQueueDxn } from '@dxos/react-client/echo';

import { TranscriptionAction, TranscriptType } from '../types';
import { getTimeStr } from '../util';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptionAction.Create,
      resolve: ({ name, spaceId }) => {
        const transcript = live(TranscriptType, {
          queue: refFromDXN(createQueueDxn(spaceId as SpaceId)),
          name: name ?? `Transcript ${getTimeStr(Date.now())}`,
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
