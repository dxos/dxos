//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { TestSchema } from '@dxos/echo/testing';
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

      expect(op.executionMode).toBe('async');
    });

    test('supports deployedId in meta', () => {
      const op = Operation.make({
        schema: {
          input: Schema.Void,
          output: Schema.Void,
        },
        meta: {
          key: 'test.deployed',
          deployedId: 'edge-func-123',
        },
      });

      expect(op.meta.deployedId).toBe('edge-func-123');
    });

    test('supports types array', () => {
      const op = Operation.make({
        schema: {
          input: Schema.Void,
          output: Schema.Void,
        },
        meta: {
          key: 'test.types',
        },
        types: [TestSchema.Task, TestSchema.Person],
      });

      expect(op.types).toHaveLength(2);
    });

    test('supports services array with Context.Tag instances', async () => {
      // Define service tags.
      class DatabaseService extends Context.Tag('@dxos/DatabaseService')<
        DatabaseService,
        { query: (sql: string) => string[] }
      >() {}
      class AiService extends Context.Tag('@dxos/AiService')<AiService, { prompt: (text: string) => string }>() {}

      // Create operation with declared services.
      const op = Operation.make({
        schema: {
          input: Schema.Struct({ query: Schema.String }),
          output: Schema.Struct({ results: Schema.Array(Schema.String), summary: Schema.String }),
        },
        meta: {
          key: 'test.services',
        },
        services: [DatabaseService, AiService],
      });

      expect(op.services).toHaveLength(2);
      expect(op.services?.[0].key).toBe('@dxos/DatabaseService');
      expect(op.services?.[1].key).toBe('@dxos/AiService');

      // Handler that requires the declared services.
      // The R type parameter captures the service requirements.
      const handler: Operation.OperationHandler<
        { query: string },
        { results: string[]; summary: string },
        Error,
        DatabaseService | AiService
      > = (input) =>
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          const ai = yield* AiService;

          const results = db.query(input.query);
          const summary = ai.prompt(`Summarize: ${results.join(', ')}`);

          return { results, summary };
        });

      const opWithHandler = Operation.withHandler(op, handler);

      // Run the handler with services provided (simulating what the invoker would do).
      const result = await opWithHandler.handler({ query: 'SELECT * FROM users' }).pipe(
        // Provide the services declared on the operation.
        Effect.provideService(DatabaseService, {
          query: (sql) => ['user1', 'user2'],
        }),
        Effect.provideService(AiService, {
          prompt: (text) => 'Two users found',
        }),
        runAndForwardErrors,
      );

      expect(result.results).toEqual(['user1', 'user2']);
      expect(result.summary).toBe('Two users found');
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

      const opWithHandler = Operation.withHandler(op, (input) => Effect.succeed({ doubled: input.value * 2 }));

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

      const opWithHandler = Function.pipe(
        op,
        Operation.withHandler((input) => Effect.succeed({ doubled: input.value * 2 })),
      );

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

      const opWithHandler = Operation.withHandler(op, (input) =>
        Effect.gen(function* () {
          yield* Effect.sleep(input.delay);
          return { done: true };
        }),
      );

      const result = await opWithHandler.handler({ delay: 10 }).pipe(runAndForwardErrors);

      expect(result).toEqual({ done: true });
    });

    test('handler can use services declared on operation', async () => {
      // Define service tags.
      class DatabaseService extends Context.Tag('@test/DatabaseService')<
        DatabaseService,
        { query: (sql: string) => string[] }
      >() {}

      // Create operation with declared services.
      const op = Operation.make({
        schema: {
          input: Schema.Struct({ query: Schema.String }),
          output: Schema.Struct({ results: Schema.Array(Schema.String) }),
        },
        meta: { key: 'test.with-services' },
        services: [DatabaseService],
      });

      // Handler uses the declared service - type is inferred correctly.
      const opWithHandler = Operation.withHandler(op, (input) =>
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          return { results: db.query(input.query) };
        }),
      );

      // Run the handler with services provided.
      const result = await opWithHandler.handler({ query: 'SELECT * FROM users' }).pipe(
        Effect.provideService(DatabaseService, {
          query: (_sql) => ['user1', 'user2'],
        }),
        runAndForwardErrors,
      );

      expect(result.results).toEqual(['user1', 'user2']);
    });

    test('handler using undeclared service is a type error', () => {
      class DeclaredService extends Context.Tag('@test/DeclaredService')<DeclaredService, { declared: () => void }>() {}
      class UndeclaredService extends Context.Tag('@test/UndeclaredService')<
        UndeclaredService,
        { undeclared: () => void }
      >() {}

      const op = Operation.make({
        schema: {
          input: Schema.Void,
          output: Schema.Void,
        },
        meta: { key: 'test.type-error' },
        services: [DeclaredService],
      });

      // Using the declared service is allowed.
      Operation.withHandler(op, (_input) =>
        Effect.gen(function* () {
          yield* DeclaredService;
        }),
      );

      // Using an undeclared service should be a type error.
      Operation.withHandler(op, (_input) =>
        // @ts-expect-error - UndeclaredService is not in the operation's services
        Effect.gen(function* () {
          yield* UndeclaredService;
        }),
      );
    });
  });
});
