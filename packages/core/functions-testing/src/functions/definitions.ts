//
// Copyright 2025 DXOS.org
//

import { Operation } from '@dxos/operation';
import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';

export const Fibonacci = Operation.make({
  meta: {
    key: 'example.org/function/fib',
    name: 'Fibonacci',
    description: 'Function that calculates a Fibonacci number',
  },
  input: Schema.Struct({
    iterations: Schema.optional(Schema.Number).annotations({
      description: 'Number of iterations',
      default: 100_000,
    }),
  }),
  output: Schema.Struct({
    result: Schema.String,
  }),
});

export const Reply = Operation.make({
  meta: {
    key: 'example.org/function/reply',
    name: 'Reply',
    description: 'Function that echoes the input',
  },
  input: Schema.Any,
  output: Schema.Any,
});

export const Sleep = Operation.make({
  meta: {
    key: 'example.org/function/sleep',
    name: 'Sleep',
    description: 'Function that sleeps for a given amount of time',
  },
  input: Schema.Struct({
    duration: Schema.optional(Schema.Number).annotations({
      description: 'Milliseconds to sleep',
      default: 100_000,
    }),
  }),
  output: Schema.Void,
});

export const QueryDb = Operation.make({
  meta: {
    key: 'example.org/function/query',
    name: 'Query',
    description: 'Queries the database',
  },
  input: Schema.Any,
  output: Schema.Any,
  services: [Database.Service],
});
