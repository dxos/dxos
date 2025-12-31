//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { runAndForwardErrors } from '@dxos/effect';

import * as Operation from './operation';

describe('Operation', () => {
  describe('make', () => {
    test('creates an operation definition with required fields', () => {
      const op = Operation.make({
        schema: {
          input: Schema.Struct({ value: Schema.Number }),
          output: Schema.Struct({ result: Schema.String }),
        },
        meta: {
          key: 'test.operation',
          name: 'Test Operation',
          description: 'A test operation',
        },
      });

      expect(op.meta.key).toBe('test.operation');
      expect(op.meta.name).toBe('Test Operation');
      expect(op.meta.description).toBe('A test operation');
      expect(Schema.isSchema(op.schema.input)).toBe(true);
      expect(Schema.isSchema(op.schema.output)).toBe(true);
    });

    test('creates an operation with optional executionMode', () => {
      const syncOp = Operation.make({
        schema: {
          input: Schema.Void,
          output: Schema.Void,
        },
        meta: {
          key: 'test.sync',
        },
        executionMode: 'sync',
      });

      expect(syncOp.executionMode).toBe('sync');

      const asyncOp = Operation.make({
        schema: {
          input: Schema.Void,
          output: Schema.Void,
        },
        meta: {
          key: 'test.async',
        },
        executionMode: 'async',
      });

      expect(asyncOp.executionMode).toBe('async');
    });

    test('defaults executionMode to async when not specified', () => {
      const op = Operation.make({
        schema: {
          input: Schema.Void,
          output: Schema.Void,
        },
        meta: {
          key: 'test.default',
        },
      });

      expect(op.executionMode).toBeUndefined();
    });

    test('operation is pipeable', () => {
      const op = Operation.make({
        schema: {
          input: Schema.Void,
          output: Schema.Void,
        },
        meta: {
          key: 'test.pipeable',
        },
      });

      expect(typeof op.pipe).toBe('function');
    });
  });

  describe('withHandler', () => {
    test('attaches a handler to an operation (direct call)', () => {
      const op = Operation.make({
        schema: {
          input: Schema.Struct({ value: Schema.Number }),
          output: Schema.Struct({ doubled: Schema.Number }),
        },
        meta: {
          key: 'test.double',
        },
      });

      const handler: Operation.OperationHandler<{ value: number }, { doubled: number }> = (input) =>
        Effect.succeed({ doubled: input.value * 2 });

      const opWithHandler = Operation.withHandler(op, handler);

      expect(opWithHandler.handler).toBe(handler);
      expect(opWithHandler.meta.key).toBe('test.double');
    });

    test('attaches a handler to an operation (piped call)', () => {
      const op = Operation.make({
        schema: {
          input: Schema.Struct({ value: Schema.Number }),
          output: Schema.Struct({ doubled: Schema.Number }),
        },
        meta: {
          key: 'test.double',
        },
      });

      const handler: Operation.OperationHandler<{ value: number }, { doubled: number }> = (input) =>
        Effect.succeed({ doubled: input.value * 2 });

      const opWithHandler = Function.pipe(op, Operation.withHandler(handler));

      expect(opWithHandler.handler).toBe(handler);
      expect(opWithHandler.meta.key).toBe('test.double');
    });

    test('handler can be async', async () => {
      const op = Operation.make({
        schema: {
          input: Schema.Struct({ delay: Schema.Number }),
          output: Schema.Struct({ done: Schema.Boolean }),
        },
        meta: {
          key: 'test.async',
        },
      });

      const handler: Operation.OperationHandler<{ delay: number }, { done: boolean }> = (input) =>
        Effect.gen(function* () {
          yield* Effect.sleep(input.delay);
          return { done: true };
        });

      const opWithHandler = Operation.withHandler(op, handler);

      const result = await opWithHandler.handler({ delay: 10 }).pipe(runAndForwardErrors);

      expect(result).toEqual({ done: true });
    });
  });
});
