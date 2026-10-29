//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as OperationHandlerAdapter from './OperationHandlerAdapter.ts';

const A = Operation.make({ meta: { key: 'org.example.operation.a' }, input: Schema.Void, output: Schema.Void });
const B = Operation.make({ meta: { key: 'org.example.operation.b' }, input: Schema.Void, output: Schema.Void });

const handlers = Capability.contribute(
  Capabilities.OperationHandler,
  OperationHandlerSet.make(A.pipe(Operation.withHandler(() => Effect.void))),
);

describe('OperationHandlerAdapter.diffOperations', () => {
  test('is empty when declared and implemented operations agree', ({ expect }) => {
    expect(OperationHandlerAdapter.diffOperations(handlers, [A.meta.key])).toEqual({
      undeclared: [],
      unimplemented: [],
    });
  });

  test('names operations missing from either side', ({ expect }) => {
    expect(OperationHandlerAdapter.diffOperations([handlers], [B.meta.key])).toEqual({
      undeclared: [A.meta.key],
      unimplemented: [B.meta.key],
    });
  });
});
