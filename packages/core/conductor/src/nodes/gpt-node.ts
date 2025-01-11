//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { log } from '@dxos/log';

import { defineComputeNode } from '../schema';
import { GptOutput, GptService, GptInput } from '../services';

export const gptNode = defineComputeNode({
  input: GptInput,
  output: GptOutput,
  compute: (input) =>
    Effect.gen(function* () {
      log.info('gpt node');
      const gpt = yield* GptService;
      return yield* gpt.invoke(input);
    }),
});
