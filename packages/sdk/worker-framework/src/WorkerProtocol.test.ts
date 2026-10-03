//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import * as WorkerProtocol from './WorkerProtocol.ts';

describe('WorkerProtocol error codec', () => {
  test('an error survives structured clone with its name, cause chain, and aggregated errors', () => {
    const migration = new Error('TEST: migration failed', { cause: new Error('TEST: wasm trap') });
    migration.name = 'MigrationError';
    const cyclic = new Error('TEST: cyclic');
    cyclic.cause = cyclic;
    const error = new AggregateError([migration, 'TEST: not an error', cyclic], 'TEST: start and teardown failed', {
      cause: migration,
    });

    const decoded = WorkerProtocol.decodeError(structuredClone(WorkerProtocol.encodeError(error)));

    invariant(decoded instanceof AggregateError);
    expect(decoded.message).toBe('TEST: start and teardown failed');
    expect(decoded.stack).toBe(error.stack);
    invariant(decoded.cause instanceof Error);
    expect(decoded.cause.name).toBe('MigrationError');

    const [first, second, third] = decoded.errors;
    expect(first).toMatchObject({ name: 'MigrationError', message: 'TEST: migration failed' });
    expect(first.cause).toMatchObject({ message: 'TEST: wasm trap' });
    expect(second).toMatchObject({ name: 'Error', message: 'TEST: not an error' });
    expect(third.message).toBe('TEST: cyclic');
    expect(third.cause).toBeUndefined();
  });

  test('an aggregated error that repeats an ancestor keeps its position', ({ expect }) => {
    const aggregate = new AggregateError([new Error('TEST: first')], 'TEST: outer');
    aggregate.errors.push(aggregate, new Error('TEST: last'));

    const decoded = WorkerProtocol.decodeError(structuredClone(WorkerProtocol.encodeError(aggregate)));

    invariant(decoded instanceof AggregateError);
    expect(decoded.errors.map((error: Error) => error.message)).toEqual(['TEST: first', '<cycle>', 'TEST: last']);
  });
});
