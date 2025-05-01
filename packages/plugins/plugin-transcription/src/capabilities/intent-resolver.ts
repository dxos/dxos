//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginsContext } from '@dxos/app-framework';
import { randomQueueDxn } from '@dxos/client';
import { live, refFromDXN } from '@dxos/live-object';
import { type SpaceId } from '@dxos/react-client/echo';

import { TranscriptionAction, TranscriptType } from '../types';
import { getTimeStr } from '../util';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptionAction.Create,
      resolve: ({ name, spaceId }) => {
        const transcript = live(TranscriptType, {
          queue: refFromDXN(randomQueueDxn(spaceId as SpaceId)),
          name: name ?? `Transcript ${getTimeStr(Date.now())}`,
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
