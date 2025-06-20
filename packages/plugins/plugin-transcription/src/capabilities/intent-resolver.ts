//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, type PluginContext } from '@dxos/app-framework';
import { Key, Obj, Ref } from '@dxos/echo';

import { TranscriptionAction, TranscriptType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptionAction.Create,
      resolve: ({ name, spaceId }) => {
        const transcript = Obj.make(TranscriptType, {
          // TODO(dmaretskyi): Use space.queues.create() instead.
          queue: Ref.fromDXN(Key.createQueueDXN(spaceId as Key.SpaceId)),
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
