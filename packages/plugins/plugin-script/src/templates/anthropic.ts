//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

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
      //
      // Basic example.
      //
      const { text } = yield* LanguageModel.generateText({ prompt: data.message }).pipe(Effect.provide(model));

      //
      // Streaming example.
      //
      const parts = yield* LanguageModel.streamText({
        prompt: 'Count from 1 to 5, one number per line.',
      }).pipe(Stream.runCollect, Effect.map(Chunk.toArray), Effect.provide(model));
      const textDeltas = parts.filter((p) => p.type === 'text-delta');
      const fullText = textDeltas.map((p) => (p as { delta: string }).delta).join('');

      return { response: text, streamText: fullText };
    });
  },
});
