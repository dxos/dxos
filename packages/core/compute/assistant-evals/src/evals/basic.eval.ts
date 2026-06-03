//
// Copyright 2026 DXOS.org
//

import { Levenshtein } from 'autoevals';
import { evalite } from 'evalite';

evalite('My Eval', {
  data: [{ input: 'Hello', expected: 'Hello World!' }],
  task: async (input) => input + ' World!',
  scorers: [Levenshtein],
});
