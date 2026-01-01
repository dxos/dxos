//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { FunctionDefinition, defineFunction } from './sdk';

describe('Function/Operation Compatibility', () => {
  test('can convert FunctionDefinition to OperationDefinition', () => {
    const func = defineFunction({
      key: 'test.function',
      name: 'Test Function',
      description: 'A test function',
      inputSchema: Schema.Struct({ value: Schema.Number }),
      outputSchema: Schema.Struct({ result: Schema.String }),
      handler: async ({ data }) => {
        return { result: data.value.toString() };
      },
    });

    const op = FunctionDefinition.toOperation(func);

    expect(op.meta.key).toBe('test.function');
    expect(op.meta.name).toBe('Test Function');
    expect(op.meta.description).toBe('A test function');
    expect(Schema.isSchema(op.schema.input)).toBe(true);
    expect(Schema.isSchema(op.schema.output)).toBe(true);
  });

  test('converted operation has matching schemas', () => {
    const inputSchema = Schema.Struct({
      name: Schema.String,
      age: Schema.Number,
    });
    const outputSchema = Schema.Struct({
      greeting: Schema.String,
    });

    const func = defineFunction({
      key: 'test.greet',
      name: 'Greet',
      inputSchema,
      outputSchema,
      handler: async ({ data }) => {
        return { greeting: `Hello, ${data.name}!` };
      },
    });

    const op = FunctionDefinition.toOperation(func);

    // Verify schemas match
    const testInput = { name: 'Alice', age: 30 };
    const validatedInput = Schema.decodeSync(op.schema.input)(testInput);
    expect(validatedInput).toEqual(testInput);

    const testOutput = { greeting: 'Hello, Alice!' };
    const validatedOutput = Schema.decodeSync(op.schema.output)(testOutput);
    expect(validatedOutput).toEqual(testOutput);
  });

  test('converted operation preserves metadata', () => {
    const func = defineFunction({
      key: 'test.meta',
      name: 'Meta Test',
      description: 'Tests metadata preservation',
      inputSchema: Schema.Void,
      outputSchema: Schema.Void,
      handler: async () => {},
    });

    const op = FunctionDefinition.toOperation(func);

    expect(op.meta.key).toBe('test.meta');
    expect(op.meta.name).toBe('Meta Test');
    expect(op.meta.description).toBe('Tests metadata preservation');
  });

  test('converted operation is pipeable', () => {
    const func = defineFunction({
      key: 'test.pipe',
      name: 'Pipe Test',
      inputSchema: Schema.Void,
      outputSchema: Schema.Void,
      handler: async () => {},
    });

    const op = FunctionDefinition.toOperation(func);

    expect(typeof op.pipe).toBe('function');
  });

  test('handles functions without output schema', () => {
    const func = defineFunction({
      key: 'test.no-output',
      name: 'No Output',
      inputSchema: Schema.Struct({ value: Schema.Number }),
      handler: async ({ data }) => {
        return data.value * 2;
      },
    });

    const op = FunctionDefinition.toOperation(func);

    expect(op.meta.key).toBe('test.no-output');
    expect(Schema.isSchema(op.schema.output)).toBe(true);
  });

  test('converted operation includes handler', () => {
    const func = defineFunction({
      key: 'test.handler',
      name: 'Handler Test',
      inputSchema: Schema.Struct({ value: Schema.Number }),
      outputSchema: Schema.Struct({ doubled: Schema.Number }),
      handler: async ({ data }) => {
        return { doubled: data.value * 2 };
      },
    });

    const op = FunctionDefinition.toOperation(func);

    expect(op.handler).toBeDefined();
    expect(typeof op.handler).toBe('function');
  });

  test('converted operation has handler function', () => {
    const func = defineFunction({
      key: 'test.execute',
      name: 'Execute Test',
      inputSchema: Schema.Struct({ value: Schema.Number }),
      outputSchema: Schema.Struct({ result: Schema.Number }),
      handler: async ({ data }) => {
        return { result: data.value * 3 };
      },
    });

    const op = FunctionDefinition.toOperation(func);

    // Handler is present and is a function that returns an Effect
    expect(op.handler).toBeDefined();
    const effect = op.handler({ value: 5 });
    // Verify it returns an Effect-like object
    expect(effect).toHaveProperty('pipe');
  });

  test('converted operation works with Effect-based handlers', () => {
    const func = defineFunction({
      key: 'test.effect',
      name: 'Effect Test',
      inputSchema: Schema.Struct({ value: Schema.Number }),
      outputSchema: Schema.Struct({ result: Schema.Number }),
      handler: Effect.fn(function* ({ data }) {
        return { result: data.value * 4 };
      }),
    });

    const op = FunctionDefinition.toOperation(func);

    // Handler is present and produces an Effect
    expect(op.handler).toBeDefined();
    const effect = op.handler({ value: 3 });
    expect(effect).toHaveProperty('pipe');
  });

  test('converted operation works with synchronous handlers', () => {
    const func = defineFunction({
      key: 'test.sync',
      name: 'Sync Test',
      inputSchema: Schema.Struct({ value: Schema.Number }),
      outputSchema: Schema.Struct({ result: Schema.Number }),
      handler: ({ data }) => {
        return { result: data.value * 5 };
      },
    });

    const op = FunctionDefinition.toOperation(func);

    // Handler is present and produces an Effect
    expect(op.handler).toBeDefined();
    const effect = op.handler({ value: 2 });
    expect(effect).toHaveProperty('pipe');
  });
});
