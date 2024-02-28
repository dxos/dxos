//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { signalHandler } from '@dxos/functions/src';

const SuggestReferenceInput = S.struct({
  content: S.string,
});

export const handler = signalHandler(SuggestReferenceInput, async ({ event, context, response }) => {
  return response.status(200).body({
    suggestions: event.content.split(' '),
  });
});
