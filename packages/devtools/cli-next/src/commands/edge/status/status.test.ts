//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { NodeContext } from '@effect/platform-node';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { TestConsole, testConsole, withTestConsole } from '../../../testing';

import { status } from './status';

const run = status.pipe(
  Command.run({
    name: 'test',
    version: '1.0.0',
  }),
);

describe('status', () => {
  it('should show status and capture console output', () =>
    Effect.gen(function* () {
      const logger = yield* TestConsole;
      // TODO(burdon): Create array of tests.
      {
        yield* run(['dx', 'status']); //.pipe(Console.withConsole(logger.console));
        console.log('===', logger.logs);
        assert.deepStrictEqual(logger.logs.at(0), { level: 'log', args: ['ok'], message: 'ok' });
      }
      {
        // TODO(burdon): Try factoring out --json attr to lower level.
        yield* run(['dx', 'status', '--json']);
        assert.containSubset(logger.logs.at(1), { level: 'log', args: [{ status: 'ok' }] });
      }
    }).pipe(
      //
      Effect.provide(Layer.mergeAll(testConsole, withTestConsole, NodeContext.layer)),
      Effect.scoped,
      Effect.runPromise,
    ));
});
