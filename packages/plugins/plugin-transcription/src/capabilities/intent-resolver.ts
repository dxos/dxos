//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginContext } from '@dxos/app-framework';
import { createQueueDxn } from '@dxos/echo-schema';
import { type SpaceId } from '@dxos/keys';
import { live, refFromDXN } from '@dxos/live-object';

import { TranscriptionAction, TranscriptType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptionAction.Create,
      resolve: ({ name, spaceId }) => {
        const transcript = live(TranscriptType, {
          queue: refFromDXN(createQueueDxn(spaceId as SpaceId)),
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
