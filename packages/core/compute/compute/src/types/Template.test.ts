//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { registryLayer } from '@dxos/echo-client';
import { DXN } from '@dxos/keys';

import { FunctionNotFoundError, NoHandlerError } from '../errors.ts';
import * as Operation from '../Operation.ts';
import * as Template from './Template.ts';

describe('Template', () => {
  describe('make', () => {
    test('creates a template with defaults', () => {
      const template = Template.make();
      expect(template.source).toBeDefined();
      expect(template.inputs).toEqual([]);
    });

    test('wraps the source string as a Text ref', () => {
      const template = Template.make({ source: 'Hello {{name}}.' });
      expect(template.source.target?.content).toBe('Hello {{name}}.');
    });

    test('preserves inputs', () => {
      const template = Template.make({
        source: 'Hello {{name}}.',
        inputs: [{ name: 'name', kind: 'value', default: 'world' }],
      });
      expect(template.inputs).toHaveLength(1);
      expect(template.inputs?.[0]).toMatchObject({ name: 'name', kind: 'value', default: 'world' });
    });
  });

  describe('schema', () => {
    test('Template is a Schema', () => {
      expect(Schema.isSchema(Template.Template)).toBe(true);
    });

    test('Input is a Schema', () => {
      expect(Schema.isSchema(Template.Input)).toBe(true);
    });

    test('InputKind accepts all documented kinds', () => {
      const decode = Schema.decodeSync(Template.InputKind);
      const kinds: readonly Template.InputKind[] = ['value', 'operation'];
      for (const kind of kinds) {
        expect(decode(kind)).toBe(kind);
      }
    });

    test('InputKind rejects unknown kinds', () => {
      expect(() => Schema.decodeUnknownSync(Template.InputKind)('nonsense')).toThrow();
    });
  });

  describe('process', () => {
    test('substitutes simple variables', () => {
      expect(Template.process('Hello {{name}}.', { name: 'world' })).toBe('Hello world.');
    });

    test('renders an empty variables object as empty placeholders', () => {
      expect(Template.process('Hello {{name}}.')).toBe('Hello .');
    });

    test('trims leading and trailing whitespace', () => {
      expect(Template.process('   \n\nHello.\n\n   ')).toBe('Hello.');
    });

    test('collapses runs of 3+ blank lines down to one blank line', () => {
      const input = 'a\n\n\n\n\nb';
      expect(Template.process(input)).toBe('a\n\nb');
    });

    test('preserves double newlines', () => {
      expect(Template.process('a\n\nb')).toBe('a\n\nb');
    });

    test('{{section}} helper increments on each call', () => {
      expect(Template.process('{{section}} / {{section}} / {{section}}')).toBe('1 / 2 / 3');
    });
  });

  describe('processTemplate', () => {
    const GREET_KEY = DXN.make('com.example.test.greet');

    const greet = Operation.withHandler(
      Operation.make({
        input: Schema.Void,
        output: Schema.String,
        meta: { key: GREET_KEY, name: 'greet' },
      }),
      () => Effect.succeed('Alice'),
    );

    // Handler map: full DXN key → invocable function.
    const handlersByKey: Record<string, (input: unknown) => Effect.Effect<unknown, unknown, unknown>> = {
      [GREET_KEY]: () => greet.handler(undefined),
    };

    const stubInvoker = Effect.provideService(Operation.Service, {
      invoke<I, O>(op: Operation.Definition<I, O>, ...args: [input?: I, options?: Operation.InvokeOptions]) {
        const key = String(op.meta.key);
        const handler = handlersByKey[key];
        // The map is keyed by string, so the per-operation O is recovered here via the call's own
        // generic rather than tracked through the map's (necessarily erased) value type.
        return (handler ? handler(args[0]) : Effect.fail(new NoHandlerError(key))) as Effect.Effect<O, NoHandlerError>;
      },
      schedule: () => Effect.succeed(undefined),
      invokePromise: () => Promise.resolve({}),
    } satisfies Operation.OperationService);

    test('resolves a value-kind input from its default', async () => {
      const template = Template.make({
        source: 'Hello {{name}}!',
        inputs: [{ name: 'name', kind: 'value', default: 'world' }],
      });

      const result = await Template.processTemplate(template).pipe(
        Effect.provide(registryLayer()),
        stubInvoker,
        Effect.runPromise,
      );
      expect(result).toBe('Hello world!');
    });

    test('resolves an operation-kind input and substitutes the result', async () => {
      const template = Template.make({
        source: 'Hello {{name}}.',
        inputs: [{ name: 'name', kind: 'operation', operation: GREET_KEY }],
      });

      const result = await Template.processTemplate(template).pipe(
        Effect.provide(registryLayer({ initial: [Operation.serialize(greet)] })),
        stubInvoker,
        Effect.runPromise,
      );

      expect(result).toBe('Hello Alice.');
    });

    test('fails with FunctionNotFoundError when the function key cannot be resolved', async () => {
      const template = Template.make({
        source: 'Hello {{name}}.',
        inputs: [{ name: 'name', kind: 'operation', operation: 'test.missing' }],
      });

      const result = await Template.processTemplate(template).pipe(
        Effect.provide(registryLayer()),
        stubInvoker,
        Effect.result,
        Effect.runPromise,
      );

      expect(result._tag).toBe('Failure');
      if (result._tag === 'Failure') {
        expect(result.failure).toBeInstanceOf(FunctionNotFoundError);
      }
    });
  });
});
