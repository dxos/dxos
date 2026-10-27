//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as SystemTags from '@dxos/plugin-inbox/SystemTags';

import { DebugOperation } from '#types';

const handler: Operation.WithHandler<typeof DebugOperation.SendSampleMail> = DebugOperation.SendSampleMail.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ message }) {
      // Long enough to read as a send on camera, short enough not to stall a test.
      yield* Effect.sleep('400 millis');
      return {
        id: `sample-${message.id}`,
        threadId: message.threadId ?? message.id,
        sentTag: { ...SystemTags.systemTagKey('sent'), label: SystemTags.SystemTag.sent.label },
      };
    }),
  ),
);

export default handler;
