//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { AiService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

const Anthropic = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.script.anthropic'),
    name: 'Anthropic Chat',
    description: 'Chat with Anthropic',
  },
  input: Schema.Struct({
    message: Schema.String,
  }),
  output: Schema.Any,
  services: [AiService.AiService],
});

export default Anthropic.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ message }) {
      const model = AiService.model('com.anthropic.model.claude-sonnet-5.default');

      //
      // Basic example.
      //
      const { text } = yield* LanguageModel.generateText({ prompt: message }).pipe(Effect.provide(model));

      //
      // Streaming example.
      //
      const parts = yield* LanguageModel.streamText({
        prompt: 'Count from 1 to 5, one number per line.',
      }).pipe(Stream.runCollect, Effect.provide(model));
      const textDeltas = parts.filter((p) => p.type === 'text-delta');
      const fullText = textDeltas.map((p) => (p as { delta: string }).delta).join('');

      return { response: text, streamText: fullText };
    }),
  ),
);
