//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  type PluginContext,
  contributes,
  createResolver,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { Transcript } from '@dxos/types';

import { TranscriptAction } from '../types';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: TranscriptAction.Create,
      resolve: ({ name, space }) => {
        const transcript = Transcript.make(space.queues.create().dxn);
        return { data: { object: transcript } };
      },
    }),
  ]),
);
