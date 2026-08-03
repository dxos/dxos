//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { trim } from '@dxos/util';

import { createEvalRunner } from '../runner';

// Ported from the gated `Smoke` scenario (../testing/smoke.test.ts).
const succeedsRunner = createEvalRunner({
  instructions: trim`
    Do nothing and succeed.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: [],
});

// `completeJob` is called without a `success` payload (nothing is requested), so the agent output
// resolves to `undefined` — evalite's SQLite storage rejects an undefined/null task result.
const succeeds = async (input: unknown, variant: Parameters<typeof succeedsRunner>[1]) =>
  (await succeedsRunner(input, variant)) ?? {};

evalite('Smoke — succeeds', {
  data: [{ input: null }],
  task: succeeds,
  scorers: [
    {
      name: 'completed',
      description: 'The agent run completed without an unexpected failure.',
      scorer: () => 1,
    },
  ],
});

const fails = createEvalRunner({
  instructions: trim`
    Do nothing and fail.
  `,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: [],
  expect: 'failure',
});

evalite('Smoke — fails', {
  data: [{ input: null }],
  task: fails,
  scorers: [
    {
      name: 'failed-as-instructed',
      description: 'The agent run failed, as instructed.',
      scorer: ({ output }) => (output.failed ? 1 : 0),
    },
  ],
});
