//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { NodeContext } from '@effect/platform-node';
import { assert, describe, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { TestConsole } from '../testing';

import { dx } from './dx';

const run = Command.run(dx, {
  name: 'DXOS CLI',
  version: '0.8.3', // {x-release-please-version}
});

const args = (cmd: string) => [__filename, ...cmd.split(' ')];

describe('smoke tests', () => {
  it('should show status and capture console output', () =>
    Effect.gen(function* () {
      const logger = yield* TestConsole.TestConsole;

      // TODO(burdon): Create array of test/result tuples?
      {
        yield* run(args('dx edge status'));
        assert.deepStrictEqual(logger.logs.at(0), { level: 'log', args: ['ok'], message: 'ok' });
      }
      {
        yield* run(args('dx edge status --json'));
        assert.containSubset(logger.logs.at(1), { level: 'log', args: [{ status: 'ok' }] });
      }
    }).pipe(Effect.provide(Layer.mergeAll(TestConsole.layer, NodeContext.layer)), Effect.scoped, Effect.runPromise));
});
