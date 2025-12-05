//
// Copyright 2025 DXOS.org
//

import * as NodeContext from '@effect/platform-node/NodeContext';
import { assert, describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { runAndForwardErrors } from '@dxos/effect';

import { TestConsole } from '../testing';

import { run } from './dx';

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
    }).pipe(Effect.provide(Layer.mergeAll(TestConsole.layer, NodeContext.layer)), Effect.scoped, runAndForwardErrors));
});
