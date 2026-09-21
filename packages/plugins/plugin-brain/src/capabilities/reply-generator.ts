//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';

import { BrainOperation } from '#types';

export const ReplyGenerator = Capability.makeModule(
  'ReplyGenerator',
  { provides: [InboxCapabilities.ReplyGenerator], activatesOn: InboxEvents.Start },
  Effect.fnUntraced(function* () {
    return Capability.contribute(InboxCapabilities.ReplyGenerator, {
      id: 'brain',
      getOperation: () => BrainOperation.GenerateReply,
    });
  }),
);
