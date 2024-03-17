//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import * as Either from 'effect/Either';

import { Document as DocumentType } from '@braneframe/types';
import { subscriptionHandler } from '@dxos/functions';
import { log } from '@dxos/log';

const ExtractTermsSignalSchema = S.struct({
  kind: S.literal('suggestion'),
  data: S.struct({
    type: S.literal('dxos.signal.lookup-next-term'),
    value: S.struct({
      activeObjectId: S.string,
    }),
  }),
});
const ExtractTermsSignalValidator = S.validateEither(ExtractTermsSignalSchema);

export const handler = subscriptionHandler(async ({ event, context, response }) => {
  const space = event.space;
  const signal = Either.getOrNull(ExtractTermsSignalValidator(event.signal));
  if (!space || !signal) {
    return response.status(400);
  }
  const document = space.db.getObjectById(signal.data.value.activeObjectId);
  if (!document || !(document instanceof DocumentType)) {
    log.info('document content not found', { id: signal.data.value.activeObjectId });
    return response.status(200);
  }
  const nextUnexplained = document.comments.find((c) => {
    const replySources = c.thread?.messages?.flatMap((m) => m.__meta.keys);
    if (replySources?.some((s) => s.source === 'openai.com')) {
      return false;
    }
    return true;
  });
  if (nextUnexplained == null || nextUnexplained.thread == null) {
    return response.status(200);
  }
  return response.status(200).body({
    type: 'trigger-prompt',
    value: {
      activeObjectId: signal.data.value.activeObjectId,
      threadId: nextUnexplained.thread.id,
      prompt: 'lookup',
      content: String(document.content.content),
      contextObjectId: document.id,
    },
  });
});
