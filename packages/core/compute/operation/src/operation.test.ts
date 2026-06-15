//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { TestSchema } from '@dxos/echo/testing';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';

describe('Operation', () => {
  describe('make', () => {
    test('creates an operation definition with required fields', () => {
      const key = DXN.make('org.example.test.operation');
      const op = Operation.make({
        input: Schema.Struct({ value: Schema.Number }),
        output: Schema.Struct({ result: Schema.String }),
        meta: {
          key,
          name: 'Test Operation',
          description: 'A test operation',
        },
      });

      expect(op.meta.key).toBe(key);
      expect(op.meta.name).toBe('Test Operation');
      expect(op.meta.description).toBe('A test operation');
      expect(Schema.isSchema(op.input)).toBe(true);
      expect(Schema.isSchema(op.output)).toBe(true);
    });

    test('creates an operation with optional executionMode', () => {
      const syncOp = Operation.make({
        input: Schema.Void,
        output: Schema.Void,
        meta: {
          key: DXN.make('org.example.test.sync'),
        },
        executionMode: 'sync',
      });

      expect(syncOp.executionMode).toBe('sync');

      const asyncOp = Operation.make({
        input: Schema.Void,
        output: Schema.Void,
        meta: {
          key: DXN.make('org.example.test.async'),
        },
        executionMode: 'async',
      });

      expect(asyncOp.executionMode).toBe('async');
    });

    test('defaults executionMode to async when not specified', () => {
      const op = Operation.make({
        input: Schema.Void,
        output: Schema.Void,
        meta: {
          key: DXN.make('org.example.test.default'),
        },
      });

      expect(op.executionMode).toBe('async');
    });

    test('supports deployedId in meta', () => {
      const op = Operation.make({
        input: Schema.Void,
        output: Schema.Void,
        meta: {
          key: DXN.make('org.example.test.deployed'),
          deployedId: 'edge-func-123',
        },
      });

      expect(op.meta.deployedId).toBe('edge-func-123');
    });

    test('supports types array', () => {
      const op = Operation.make({
        input: Schema.Void,
        output: Schema.Void,
        meta: {
          key: DXN.make('org.example.test.types'),
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
        input: Schema.Struct({ query: Schema.String }),
        output: Schema.Struct({ results: Schema.Array(Schema.String), summary: Schema.String }),
        meta: {
          key: DXN.make('org.example.test.services'),
        },
        services: [DatabaseService, AiService],
      });

      expect(op.services).toHaveLength(2);
      expect(op.services[0].key).toBe('@dxos/DatabaseService');
      expect(op.services[1].key).toBe('@dxos/AiService');

      const opWithHandler = Operation.withHandler(op, (input) =>
        Effect.gen(function* () {
          const db = yield* DatabaseService;
          const ai = yield* AiService;

          const results = db.query(input.query);
          const summary = ai.prompt(`Summarize: ${results.join(', ')}`);

          return { results, summary };
        }),
      );

      // Run the handler with services provided (simulating what the invoker would do).
      const result = await opWithHandler.handler({ query: 'SELECT * FROM users' }).pipe(
        // Provide the services declared on the operation.
        Effect.provideService(DatabaseService, {
          query: (_sql) => ['user1', 'user2'],
        }),
        Effect.provideService(AiService, {
          prompt: (_text) => 'Two users found',
        }),
        EffectEx.runAndForwardErrors,
      );

      expect(result.results).toEqual(['user1', 'user2']);
      expect(result.summary).toBe('Two users found');
    });

    test('operation is pipeable', () => {
      const op = Operation.make({
        input: Schema.Void,
        output: Schema.Void,
        meta: {
          key: DXN.make('org.example.test.pipeable'),
        },
      });

      expect(typeof op.pipe).toBe('function');
    });
  });

  describe('withHandler', () => {
    test('attaches a handler to an operation (direct call)', () => {
      const key = DXN.make('org.example.test.double');
      const op = Operation.make({
        input: Schema.Struct({ value: Schema.Number }),
        output: Schema.Struct({ doubled: Schema.Number }),
        meta: { key },
      });

      const opWithHandler = Operation.withHandler(op, (input) => Effect.succeed({ doubled: input.value * 2 }));

      expect(opWithHandler.meta.key).toBe(key);
    });

    test('attaches a handler to an operation (piped call)', () => {
      const key = DXN.make('org.example.test.doublePiped');
      const op = Operation.make({
        input: Schema.Struct({ value: Schema.Number }),
        output: Schema.Struct({ doubled: Schema.Number }),
        meta: { key },
      });

      const opWithHandler = Function.pipe(
        op,
        Operation.withHandler((input) => Effect.succeed({ doubled: input.value * 2 })),
      );

      expect(opWithHandler.meta.key).toBe(key);
    });

    test('handler can be async', async () => {
      const op = Operation.make({
        input: Schema.Struct({ delay: Schema.Number }),
        output: Schema.Struct({ done: Schema.Boolean }),
        meta: {
          key: DXN.make('org.example.test.asyncHandler'),
        },
      });

      const opWithHandler = Operation.withHandler(op, (input) =>
        Effect.gen(function* () {
          yield* Effect.sleep(input.delay);
          return { done: true };
        }),
      );

      const result = await opWithHandler.handler({ delay: 10 }).pipe(EffectEx.runAndForwardErrors);

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
        input: Schema.Struct({ query: Schema.String }),
        output: Schema.Struct({ results: Schema.Array(Schema.String) }),
        meta: { key: DXN.make('org.example.test.withServices') },
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
        EffectEx.runAndForwardErrors,
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
        input: Schema.Void,
        output: Schema.Void,
        meta: { key: DXN.make('org.example.test.typeError') },
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
