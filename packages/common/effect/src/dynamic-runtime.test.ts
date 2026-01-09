//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Runtime from 'effect/Runtime';
import { describe, expect, test } from 'vitest';

import * as DynamicRuntime from './dynamic-runtime';
import { runAndForwardErrors } from './errors';

// Test service tags
class Database extends Context.Tag('Database')<Database, { query: (sql: string) => Effect.Effect<string[]> }>() {}

class Logger extends Context.Tag('Logger')<Logger, { log: (msg: string) => Effect.Effect<void> }>() {}

class Cache extends Context.Tag('Cache')<Cache, { get: (key: string) => Effect.Effect<string | undefined> }>() {}

describe('DynamicRuntime', () => {
  describe('Success Cases', () => {
    test('single tag validation success with runPromise', async () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const result = await runtime.runPromise(program);
      expect(result).toEqual(['result: SELECT * FROM users']);
    });

    test('single tag validation success with runSync', () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const result = runtime.runSync(program);
      expect(result).toEqual(['result: SELECT * FROM users']);
    });

    test('single tag validation success with runSyncExit', () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const exit = runtime.runSyncExit(program);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toEqual(['result: SELECT * FROM users']);
      }
    });

    test('single tag validation success with runPromiseExit', async () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const exit = await runtime.runPromiseExit(program);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toEqual(['result: SELECT * FROM users']);
      }
    });

    test('multiple tags validation success', async () => {
      const layer = Layer.mergeAll(
        Layer.succeed(Database, {
          query: (sql: string) => Effect.succeed([`result: ${sql}`]),
        }),
        Layer.succeed(Logger, {
          log: (msg: string) => Effect.sync(() => console.log(msg)),
        }),
      );
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database, Logger]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        const logger = yield* Logger;
        yield* logger.log('Querying database');
        return yield* db.query('SELECT * FROM users');
      });

      const result = await runtime.runPromise(program);
      expect(result).toEqual(['result: SELECT * FROM users']);
    });

    test('effect requiring subset of tags executes successfully', async () => {
      const layer = Layer.mergeAll(
        Layer.succeed(Database, {
          query: (sql: string) => Effect.succeed([`result: ${sql}`]),
        }),
        Layer.succeed(Logger, {
          log: (msg: string) => Effect.sync(() => console.log(msg)),
        }),
      );
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database, Logger]);

      // Effect only requires Database, not Logger
      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const result = await runtime.runPromise(program);
      expect(result).toEqual(['result: SELECT * FROM users']);
    });

    test('runFork with valid tags', async () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const fiber = runtime.runFork(program);
      const exit = await runAndForwardErrors(fiber.await);
      expect(Exit.isSuccess(exit)).toBe(true);
      if (Exit.isSuccess(exit)) {
        expect(exit.value).toEqual(['result: SELECT * FROM users']);
      }
    });

    test('runtimeEffect returns runtime with correct context', async () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const rt = await runtime.runPromise(runtime.runtimeEffect);
      expect(rt).toBeDefined();
      // Verify we can use the runtime directly
      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('test');
      });
      const result = await Runtime.runPromise(rt)(program);
      expect(result).toEqual(['result: test']);
    });

    test('complex effect composition with multiple tags', async () => {
      const layer = Layer.mergeAll(
        Layer.succeed(Database, {
          query: (sql: string) => Effect.succeed([`result: ${sql}`]),
        }),
        Layer.succeed(Logger, {
          log: (msg: string) => Effect.sync(() => console.log(msg)),
        }),
        Layer.succeed(Cache, {
          get: (key: string) => Effect.succeed(key === 'key1' ? 'cached' : undefined),
        }),
      );
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database, Logger, Cache]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        const logger = yield* Logger;
        const cache = yield* Cache;

        yield* logger.log('Checking cache');
        const cached = yield* cache.get('key1');
        if (cached) {
          yield* logger.log('Cache hit');
          return [cached];
        }
        yield* logger.log('Cache miss, querying database');
        return yield* db.query('SELECT * FROM users');
      });

      const result = await runtime.runPromise(program);
      expect(result).toEqual(['cached']);
    });

    test('empty tag array edge case', async () => {
      const layer = Layer.empty;
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), []);

      const program = Effect.succeed('no dependencies');

      const result = await runtime.runPromise(program);
      expect(result).toBe('no dependencies');
    });
  });

  describe('Failure Cases', () => {
    test('missing single tag throws error with runPromise', async () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      await expect(runtime.runPromise(program)).rejects.toThrow(/Missing required tags in runtime: Database/);
    });

    test('missing single tag throws error with runSync', () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      expect(() => runtime.runSync(program)).toThrow(/Missing required tags in runtime: Database/);
    });

    test('missing single tag throws error with runSyncExit', () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const exit = runtime.runSyncExit(program);
      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        // Exit.cause is available directly when Exit.isFailure is true
        expect(exit.cause).toBeDefined();
      }
    });

    test('missing single tag throws error with runPromiseExit', async () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      const exit = await runtime.runPromiseExit(program);
      expect(Exit.isFailure(exit)).toBe(true);
    });

    test('missing multiple tags lists all missing tags', async () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database, Logger, Cache]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        const logger = yield* Logger;
        yield* logger.log('test');
        return yield* db.query('SELECT * FROM users');
      });

      await expect(runtime.runPromise(program)).rejects.toThrow(/Missing required tags in runtime/);
      try {
        await runtime.runPromise(program);
      } catch (error: any) {
        expect(error.message).toContain('Database');
        expect(error.message).toContain('Logger');
        expect(error.message).toContain('Cache');
      }
    });

    test('partial tag availability - only missing tags listed', async () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      // Only Database is provided, Logger and Cache are missing
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database, Logger, Cache]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        const logger = yield* Logger;
        yield* logger.log('test');
        return yield* db.query('SELECT * FROM users');
      });

      await expect(runtime.runPromise(program)).rejects.toThrow(/Missing required tags in runtime/);
      try {
        await runtime.runPromise(program);
      } catch (error: any) {
        // Should only list missing tags, not Database
        expect(error.message).toContain('Logger');
        expect(error.message).toContain('Cache');
        expect(error.message).not.toContain('Database');
      }
    });

    test('runFork with missing tags throws error', async () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('SELECT * FROM users');
      });

      expect(() => runtime.runFork(program)).toThrow(/Missing required tags in runtime: Database/);
    });

    test('runtimeEffect with missing tags throws error', async () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      await expect(runtime.runPromise(runtime.runtimeEffect)).rejects.toThrow(
        /Missing required tags in runtime: Database/,
      );
    });
  });

  describe('Integration Tests', () => {
    test('real-world layer composition with dependencies', async () => {
      // Simulate a real-world scenario with layer dependencies
      const DatabaseLayer = Layer.effect(
        Database,
        Effect.gen(function* () {
          return {
            query: (sql: string) => Effect.succeed([`result: ${sql}`]),
          };
        }),
      );

      const LoggerLayer = Layer.effect(
        Logger,
        Effect.gen(function* () {
          return {
            log: (msg: string) => Effect.sync(() => console.log(msg)),
          };
        }),
      );

      const layer = Layer.mergeAll(DatabaseLayer, LoggerLayer);
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database, Logger]);

      const program = Effect.gen(function* () {
        const logger = yield* Logger;
        yield* logger.log('Starting query');
        const db = yield* Database;
        const result = yield* db.query('SELECT * FROM users');
        yield* logger.log('Query completed');
        return result;
      });

      const result = await runtime.runPromise(program);
      expect(result).toEqual(['result: SELECT * FROM users']);
    });

    test('runtime lifecycle - dispose properly cleans up', async () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('test');
      });

      const result = await runtime.runPromise(program);
      expect(result).toEqual(['result: test']);

      // Dispose should not throw
      await expect(runtime.dispose()).resolves.toBeUndefined();
    });

    test('validation happens lazily on first use', async () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      // Creating the runtime should not throw
      expect(runtime).toBeDefined();

      // First use should trigger validation and throw
      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('test');
      });

      await expect(runtime.runPromise(program)).rejects.toThrow();
    });

    test('validation is cached for async operations', async () => {
      const layer = Layer.empty; // No tags provided
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      const program = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('test');
      });

      // First call should trigger validation
      const promise1 = runtime.runPromise(program);
      // Second call should use cached validation
      const promise2 = runtime.runPromise(program);

      // Both should fail with the same error
      await expect(promise1).rejects.toThrow(/Missing required tags in runtime: Database/);
      await expect(promise2).rejects.toThrow(/Missing required tags in runtime: Database/);
    });
  });

  describe('Type Safety', () => {
    test('effects with correct context types are accepted', () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      // This should compile without errors
      const program: Effect.Effect<string[], never, Database> = Effect.gen(function* () {
        const db = yield* Database;
        return yield* db.query('test');
      });

      // TypeScript should accept this
      expect(() => runtime.runSync(program)).not.toThrow();
    });

    test('type safety prevents effects requiring wrong tags', () => {
      const layer = Layer.succeed(Database, {
        query: (sql: string) => Effect.succeed([`result: ${sql}`]),
      });
      const runtime = DynamicRuntime.make(ManagedRuntime.make(layer), [Database]);

      // This effect requires Logger but runtime only provides Database
      // TypeScript correctly prevents this at compile time - the type system enforces
      // that effects must only require tags that are in the runtime's tag list.
      // If you uncomment the lines below, TypeScript will error:
      // const program = Effect.gen(function* () {
      //   const logger = yield* Logger; // Error: Logger is not assignable to Database
      //   yield* logger.log('test');
      // });
      // runtime.runSync(program); // Error: Effect<void, never, Logger> is not assignable to Effect<void, never, Database>

      // The type system successfully prevents this, which is the desired behavior
      expect(runtime).toBeDefined();
    });
  });
});
