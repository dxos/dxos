//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { extractContact } from '@dxos/extractor-lib';
import { Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { EmailPipelineCtx } from './context';

/** Extract a Person (+ Organization) from the sender and persist to the ECHO space; pass message through. */
export const extractContactsStage: Stage.Stage<Message.Message, Message.Message, never, EmailPipelineCtx> = Stage.map(
  'extract-contacts',
  (message) =>
    Effect.gen(function* () {
      const { db } = yield* EmailPipelineCtx;
      const result = yield* extractContact({ db, source: message });
      for (const object of result.created) {
        db.add(object);
      }
      return message;
    }),
);
