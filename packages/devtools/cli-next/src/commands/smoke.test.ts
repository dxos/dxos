//
// Copyright 2025 DXOS.org
//

import { NodeContext } from '@effect/platform-node';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { run } from '../bin';
import { TestConsole } from '../testing';

const args = (cmd: string) => [__filename, ...cmd.split(' ')];

describe('smoke tests', () => {
  it('should show status and capture console output', () =>
    Effect.gen(function* () {
      const logger = yield* TestConsole.TestConsole;

      // TODO(burdon): Create array of test/result tuples?
      {
        yield* run(args('dx hub status'));
        assert.deepStrictEqual(logger.logs.at(0), { level: 'log', args: ['ok'], message: 'ok' });
      }
      {
        yield* run(args('dx --json hub status'));
        assert.containSubset(logger.logs.at(1), { level: 'log', args: [{ status: 'ok' }] });
      }
    }).pipe(Effect.provide(Layer.mergeAll(TestConsole.layer, NodeContext.layer)), Effect.scoped, Effect.runPromise));
});
