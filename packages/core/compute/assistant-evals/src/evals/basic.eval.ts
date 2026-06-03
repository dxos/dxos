//
// Copyright 2026 DXOS.org
//

import { Levenshtein } from 'autoevals';
import { evalite } from 'evalite';

import { runAgentEval } from '../harness';
import { trim } from '@dxos/util';

const runner = async (input: string) => {
  const result = await runAgentEval({
    blueprints: [],
    instructions: input,
  });
  return typeof result === 'string' ? result : JSON.stringify(result ?? {});
};

evalite('My Eval', {
  data: [
    {
      input: trim`
        Do nothing and succeed.
      `,
      expected: '{}',
    },
  ],
  task: runner,
  scorers: [Levenshtein],
});
