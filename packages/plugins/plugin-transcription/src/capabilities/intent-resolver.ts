//
// Copyright 2025 DXOS.org
//

import { Capabilities, type PluginContext, contributes, createResolver } from '@dxos/app-framework';
import { type Key, Obj, Ref } from '@dxos/echo';
import { createQueueDXN } from '@dxos/echo-schema';

import { TranscriptType, TranscriptionAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptionAction.Create,
      resolve: ({ name, spaceId }) => {
        const transcript = Obj.make(TranscriptType, {
          // TODO(dmaretskyi): Use space.queues.create() instead.
          queue: Ref.fromDXN(createQueueDXN(spaceId as Key.SpaceId)),
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
