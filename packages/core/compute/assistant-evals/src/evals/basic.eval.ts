//
// Copyright 2026 DXOS.org
//

import { Levenshtein } from 'autoevals';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { trim } from '@dxos/util';

import { createEvalRunner, type VariantConfig } from '../runner';

// TODO(dmaretskyi): Still some ways to go. I want this to be able to perform complex tasks inside composer, and then evaluate the output and effects (i.e. Database changes).
// To that end:
// - Lock-in input/output schema, the input is the task + config, the output is the result of the task and the database state.
// - Add evaluators that call out to anthropic models and assert that the task was completed succesfully, as well as go through the list of completion criteria.
// - Add evaluators based on database queries.
const task = createEvalRunner({
  instructions: trim`
    Answer the question.
  `,
  input: Schema.String,
  output: Schema.String,
});

evalite.each<VariantConfig>([
  {
    name: 'claude-haiku-4-5',
    input: { model: 'ai.claude.model.claude-haiku-4-5' },
  },
  {
    name: 'claude-sonnet-4-5',
    input: { model: 'ai.claude.model.claude-sonnet-4-5' },
  },
  {
    name: 'claude-opus-4-6',
    input: { model: 'ai.claude.model.claude-opus-4-6' },
  },
])('Question answering', {
  data: [
    {
      input: 'What is the capital of France?',
      expected: 'Paris',
    },
    {
      input: 'What is the capital of Germany?',
      expected: 'Berlin',
    },
  ],
  task,
  scorers: [Levenshtein],
});
