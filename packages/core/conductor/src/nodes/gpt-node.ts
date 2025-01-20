//
// Copyright 2025 DXOS.org
//

import { Effect } from 'effect';

import { log } from '@dxos/log';

import { GptService } from '../services';
import { defineComputeNode, GptInput, GptOutput } from '../types';

export const gptNode = defineComputeNode({
  input: GptInput,
  output: GptOutput,
  exec: (input) =>
    Effect.gen(function* () {
      log.info('gpt node');
      const gpt = yield* GptService;
      return yield* gpt.invoke(input);
    }),
});
