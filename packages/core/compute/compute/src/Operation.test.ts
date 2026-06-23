//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Operation from './Operation';

const KEY = DXN.make('org.example.test.op');

const makeOp = () => Operation.make({ input: Schema.Void, output: Schema.String, meta: { key: KEY, name: 'Test Op' } });

describe('Operation visibility', () => {
  test('operations are hidden by default', ({ expect }) => {
    expect(Operation.isVisible(Operation.serialize(makeOp()))).toBe(false);
  });

  test('visible combinator marks an operation visible', ({ expect }) => {
    expect(Operation.isVisible(Operation.serialize(makeOp().pipe(Operation.visible)))).toBe(true);
  });

  test('annotate does not mutate the input definition', ({ expect }) => {
    const op = makeOp();
    const annotated = op.pipe(Operation.visible);
    expect(Operation.isVisible(Operation.serialize(annotated))).toBe(true);
    // The original definition is untouched — combinators return a fresh value.
    expect(Operation.isVisible(Operation.serialize(op))).toBe(false);
  });

  test('visible preserves the definition type so a handler still attaches', ({ expect }) => {
    // Type-preservation is a compile-time guarantee; this asserts the value path also works.
    const op = makeOp().pipe(Operation.visible, (op) => Operation.withHandler(op, () => Effect.succeed('ok')));
    expect(Operation.isOperationWithHandler(op)).toBe(true);
  });
});
