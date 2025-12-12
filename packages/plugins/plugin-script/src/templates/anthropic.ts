//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { defineFunction } from '@dxos/functions';

export default defineFunction({
  key: 'dxos.org/script/anthropic',
  name: 'Anthropic Chat',
  description: 'Chat with Anthropic',
  inputSchema: Schema.Struct({
    message: Schema.String,
  }),
  services: [AiService.AiService],
  handler: ({ data }) => {
    return Effect.gen(function* () {
      const model = (yield* AiService.AiService).model('@anthropic/claude-sonnet-4-5');
      const { text } = yield* LanguageModel.generateText({ prompt: data.message }).pipe(Effect.provide(model));
      return { response: text };
    });
  },
});
