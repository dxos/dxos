//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';

import { DraftMessage, InboxOperation } from '../types';
import { createDraftMessage } from '../util';

const handler: Operation.WithHandler<typeof InboxOperation.DraftReply> = InboxOperation.DraftReply.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode, message, mailbox }) {
      const props = createDraftMessage({ mode, message, mailbox });
      const draft = DraftMessage.make(props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
      });

      return { draftId: draft.id };
    }),
  ),
);

export default handler;
