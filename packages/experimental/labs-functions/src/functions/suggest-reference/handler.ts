//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { signalHandler } from '@dxos/functions';
import { log } from '@dxos/log';

const SuggestReferenceInput = S.struct({
  content: S.string,
});

export const handler = signalHandler(SuggestReferenceInput, async ({ event, context, response }) => {
  log.info('triggered', { event });
  return response.status(200).body({
    type: 'suggestions',
    value: {
      suggestions: event.content.split(' '),
    },
  });
});
