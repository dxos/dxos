//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { defineComputeNode } from '../schema';
import { LLMTool, Message, ResultStreamEvent } from '@dxos/assistant';
import { StreamSchema } from '../schema-dsl';
import { GptOutput, GptService } from '../services/gpt';
import { GptInput } from '../services/gpt';
import { Effect } from 'effect';
import { log } from '@dxos/log';

export const gptNode = defineComputeNode({
  input: GptInput,
  output: GptOutput,
  compute: (input) =>
    Effect.gen(function* () {
      log.info('gpt node');
      const gpt = yield* GptService;
      const result = yield* gpt.invoke(input);
      return result;
    }),
});
