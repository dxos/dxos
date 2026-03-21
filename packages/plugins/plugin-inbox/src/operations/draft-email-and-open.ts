//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { Message } from '@dxos/types';

import { buildDraftMessageProps } from '../util';

import { DraftEmailAndOpen } from './definitions';

export default DraftEmailAndOpen.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, mode, replyToMessage, subject, body, mailbox }) {
      const props = buildDraftMessageProps({
        mode,
        replyToMessage: replyToMessage as Message.Message | undefined,
        subject,
        body,
        mailbox,
      });
      const draft = Obj.make(Message.Message, props);
      yield* Operation.invoke(SpaceOperation.AddObject, {
        object: draft,
        target: db,
        hidden: true,
      });
      yield* Operation.invoke(LayoutOperation.Open, { subject: [getObjectPathFromObject(draft)] });
    }),
  ),
);
