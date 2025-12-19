//
// Copyright 2025 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { runAndForwardErrors } from '@dxos/effect';

import { FormBuilder, print } from './printer';

describe('FormBuilder', () => {
  it('build', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const builder = FormBuilder.of({ title: 'Test' })
          // prettier-ignore
          .set({ key: 'foo', value: 100 })
          .set({ key: 'bar', value: true });

        const doc = builder.build();
        yield* Console.log(print(doc));
      }),
    ));

  it('hierarchical build', () =>
    runAndForwardErrors(
      Effect.gen(function* () {
        const nested = FormBuilder.of({})
          // prettier-ignore
          .set({ key: 'nested1', value: 'value1' })
          .set({ key: 'nested2', value: 42 });

        const builder = FormBuilder.of({ title: 'Parent' })
          // prettier-ignore
          .set({ key: 'top', value: 'top-level' })
          .set({ key: 'child', value: nested })
          .set({ key: 'bottom', value: 'bottom-level' });

        const doc = builder.build();
        const result = print(doc);
        yield* Console.log(result);
      }),
    ));
});
