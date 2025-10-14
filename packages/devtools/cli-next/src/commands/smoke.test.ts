//
// Copyright 2025 DXOS.org
//

import * as NodeContext from '@effect/platform-node/NodeContext';
import * as Test from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { TestConsole } from '../testing';

import { run } from './dx';

const args = (cmd: string) => [__filename, ...cmd.split(' ')];

Test.describe('smoke tests', () => {
  Test.it('should show status and capture console output', () =>
    Effect.gen(function* () {
      const logger = yield* TestConsole.TestConsole;

      // TODO(burdon): Create array of test/result tuples?
      {
        yield* run(args('dx hub status'));
        Test.assert.deepStrictEqual(logger.logs.at(0), { level: 'log', args: ['ok'], message: 'ok' });
      }
      {
        yield* run(args('dx --json hub status'));
        Test.assert.containSubset(logger.logs.at(1), { level: 'log', args: [{ status: 'ok' }] });
      }
    }).pipe(Effect.provide(Layer.mergeAll(TestConsole.layer, NodeContext.layer)), Effect.scoped, Effect.runPromise),
  );
});
