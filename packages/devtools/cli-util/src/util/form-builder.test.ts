//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { FormBuilder, print } from '@dxos/cli-util';
import { runAndForwardErrors } from '@dxos/effect';

describe('FormBuilder', () => {
  it('option', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const builder = FormBuilder.make({ title: 'Option Test' }).pipe(
          FormBuilder.option('some', Option.some('value')),
          FormBuilder.option('none', Option.none()),
        );

        const doc = FormBuilder.build(builder);
        yield* Console.log(print(doc));
      }),
    ));

  it('when', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const builder = FormBuilder.make({ title: 'When Test' }).pipe(
          FormBuilder.when(true, FormBuilder.set('included', 'true')),
          FormBuilder.when(false, FormBuilder.set('excluded', 'false')),
        );

        const doc = FormBuilder.build(builder);
        yield* Console.log(print(doc));
      }),
    ));

  it('each', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const items = ['a', 'b', 'c'];
        const builder = FormBuilder.make({ title: 'Each Test' }).pipe(
          FormBuilder.each(items, (item: string) => FormBuilder.set('item', item)),
        );

        const doc = FormBuilder.build(builder);
        yield* Console.log(print(doc));
      }),
    ));

  it('build', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const builder = FormBuilder.make({ title: 'Test' }).pipe(
          FormBuilder.set('foo', 100),
          FormBuilder.set('bar', true),
        );

        const doc = FormBuilder.build(builder);
        yield* Console.log(print(doc));
      }),
    ));

  it('nest', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const nested = FormBuilder.make({ title: 'Nested' }).pipe(
          FormBuilder.set('nested1', 'value1'),
          FormBuilder.set('nested2', 42),
        );

        const builder = FormBuilder.make({ title: 'Parent' }).pipe(
          FormBuilder.set('top', 'top-level'),
          FormBuilder.nest('child', nested),
          FormBuilder.set('bottom', 'bottom-level'),
        );

        const doc = FormBuilder.build(builder);
        yield* Console.log(print(doc));
      }),
    ));

  it('nestedOption', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const nested = FormBuilder.make({ title: 'Nested' }).pipe(FormBuilder.set('key', 'value'));

        const builder = FormBuilder.make({ title: 'Parent' }).pipe(
          FormBuilder.nestedOption('some', Option.some(nested)),
          FormBuilder.nestedOption('none', Option.none()),
        );

        const doc = FormBuilder.build(builder);
        yield* Console.log(print(doc));
      }),
    ));

  it('multi-level nesting', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const grandchild = FormBuilder.make({ title: 'Grandchild' }).pipe(
          FormBuilder.set('grandchild1', 'value1'),
          FormBuilder.set('grandchild2', 'value2'),
        );

        const child = FormBuilder.make({ title: 'Child' }).pipe(
          FormBuilder.set('child1', 'value1'),
          FormBuilder.nest('grandchild', grandchild),
          FormBuilder.set('child2', 'value2'),
        );

        const parent = FormBuilder.make({ title: 'Parent' }).pipe(
          FormBuilder.set('top', 'top-level'),
          FormBuilder.nest('child', child),
          FormBuilder.set('bottom', 'bottom-level'),
        );

        const doc = FormBuilder.build(parent);
        yield* Console.log(print(doc));
      }),
    ));

  it('pipeable build', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const doc = FormBuilder.make({ title: 'Pipeable' }).pipe(
          FormBuilder.set('foo', 100),
          FormBuilder.set('bar', true),
          FormBuilder.build,
        );
        yield* Console.log(print(doc));
      }),
    ));

  it('dual calling styles', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        // Curried style (pipe)
        const builder1 = FormBuilder.make({ title: 'Curried' }).pipe(
          FormBuilder.set('key1', 'value1'),
          FormBuilder.option('key2', Option.some('value2')),
        );

        // Direct style
        const builder2 = FormBuilder.make({ title: 'Direct' });
        FormBuilder.set(builder2, 'key1', 'value1');
        FormBuilder.option(builder2, 'key2', Option.some('value2'));

        const doc1 = FormBuilder.build(builder1);
        const doc2 = FormBuilder.build(builder2);
        yield* Console.log('Curried:', print(doc1));
        yield* Console.log('Direct:', print(doc2));
      }),
    ));
});
