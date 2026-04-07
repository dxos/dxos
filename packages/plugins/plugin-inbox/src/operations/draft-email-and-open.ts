//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type Message } from '@dxos/types';

import { DraftMessage } from '../types';
import { buildDraftMessageProps } from '../util';

import { DraftEmailAndOpen } from './definitions';

const handler: Operation.WithHandler<typeof DraftEmailAndOpen> = DraftEmailAndOpen.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode, replyToMessage, subject, body, mailbox }) {
      const props = buildDraftMessageProps({
        mode,
        replyToMessage: replyToMessage as Message.Message | undefined,
        subject,
        body,
        mailbox,
      });
      const draft = DraftMessage.make(props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
        hidden: true,
      });
      yield* Operation.invoke(LayoutOperation.Open, { subject: [getObjectPathFromObject(draft)] });
    }),
  ),
);

export default handler;
