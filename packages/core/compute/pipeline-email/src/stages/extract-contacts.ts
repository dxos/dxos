//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { extractContact } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { EmailPipelineCtx } from './context.ts';

/** Extract a Person (+ Organization) from the sender and persist to the ECHO space; pass message through. */
export const extractContactsStage: Stage.Stage<Message.Message, Message.Message, never, EmailPipelineCtx> = Stage.map(
  'extract-contacts',
  (message) =>
    Effect.gen(function* () {
      const { db } = yield* EmailPipelineCtx;
      // A contact is derived data: one sender that cannot become a Person must not fail the sync run
      // (and strand every later message), so a defect is logged and the message passes through.
      yield* Effect.gen(function* () {
        const result = yield* extractContact({ db, source: message });
        for (const object of result.created) {
          db.add(object);
        }
      }).pipe(
        Effect.catchDefect((defect) =>
          Effect.sync(() => log.warn('contact extraction failed; message kept without a contact', { defect })),
        ),
      );
      return message;
    }),
);
