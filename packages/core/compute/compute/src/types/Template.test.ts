//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { registryLayer } from '@dxos/echo-client';
import { DXN } from '@dxos/keys';

import { FunctionNotFoundError } from '../errors';
import * as Operation from '../Operation';
import * as Template from './Template';

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
      for (const kind of ['value', 'operation']) {
        expect(decode(kind as any)).toBe(kind);
      }
    });

    test('InputKind rejects unknown kinds', () => {
      expect(() => Schema.decodeSync(Template.InputKind)('nonsense' as any)).toThrow();
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
    const GREET_KEY = DXN.make('org.example.test.greet');

    const greet = Operation.withHandler(
      Operation.make({
        input: Schema.Void,
        output: Schema.String,
        meta: { key: GREET_KEY, name: 'greet' },
      }),
      () => Effect.succeed('Alice'),
    );

    // Handler map: full DXN key → invocable function.
    const handlersByKey: Record<string, (input: any) => Effect.Effect<any, any, any>> = {
      [GREET_KEY]: (input) => greet.handler(input),
    };

    const stubInvoker = Effect.provideService(Operation.Service, {
      invoke: (op: any, input: any) => {
        const key = String(op.meta.key);
        const handler = handlersByKey[key];
        return handler ? handler(input) : Effect.die(`no handler for key: ${key}`);
      },
      schedule: () => Effect.succeed(undefined),
      invokePromise: () => Promise.resolve({}),
      // Operation.OperationService.invoke is a complex overloaded type; a partial test stub
      // cannot express all overload variants without the cast.
    } as unknown as Operation.OperationService);

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
        Effect.either,
        Effect.runPromise,
      );

      expect(result._tag).toBe('Left');
      if (result._tag === 'Left') {
        expect(result.left).toBeInstanceOf(FunctionNotFoundError);
      }
    });
  });
});
