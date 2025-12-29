//
// Copyright 2025 DXOS.org
//

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { Transcript } from '@dxos/types';

import { TranscriptAction } from '../../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.IntentResolver, [
    createResolver({
      intent: TranscriptAction.Create,
      resolve: ({ name, space }) => {
        const transcript = Transcript.make(space.queues.create().dxn);
        return { data: { object: transcript } };
      },
    }),
  ]),
);
