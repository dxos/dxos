//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { EmailPipelineCtx } from './context';

/** Pure-JS running tallies (senders, recipients, spam); pass message through. */
export const statsStage: Stage.Stage<Message.Message, Message.Message, never, EmailPipelineCtx> = Stage.map(
  'stats',
  (message) =>
    Effect.gen(function* () {
      const { stats } = yield* EmailPipelineCtx;
      stats.total += 1;
      const sender = message.sender.email;
      if (sender) {
        stats.from.set(sender, (stats.from.get(sender) ?? 0) + 1);
      }
      const recipients = message.properties?.to;
      if (Array.isArray(recipients)) {
        for (const recipient of recipients) {
          const address = String(recipient);
          stats.to.set(address, (stats.to.get(address) ?? 0) + 1);
        }
      }
      if (message.properties?.spam) {
        stats.spam += 1;
      }
      return message;
    }),
);
