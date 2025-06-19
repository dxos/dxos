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
          queue: Ref.fromDXN(Key.createQueueDxn(spaceId as Key.SpaceId)),
        });

        return { data: { object: transcript } };
      },
    }),
  ]);
