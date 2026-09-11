//
// Copyright 2026 DXOS.org
//

// This file needs invalid usage, so the diagnostic reporting it is the assertion.
/** @effect-diagnostics unnecessaryEffectGen:skip-file */

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, expect, it } from 'tstyche';

import { DXN } from '@dxos/keys';

import * as Operation from './Operation.ts';

class DeclaredService extends Context.Service<DeclaredService, { declared: () => void }>()('@test/DeclaredService') {}
class UndeclaredService extends Context.Service<UndeclaredService, { undeclared: () => void }>()(
  '@test/UndeclaredService',
) {}

const op = Operation.make({
  input: Schema.Void,
  output: Schema.Void,
  meta: { key: DXN.make('com.example.operation.test.typeError') },
  services: [DeclaredService],
});

const sideEffect = Operation.make({
  input: Schema.Void,
  output: Schema.Void,
  meta: { key: DXN.make('com.example.operation.test.sideEffect') },
});

describe('Operation.withHandler service requirements', () => {
  it('accepts a service the operation declares', () => {
    expect(
      Operation.withHandler(op, (_input) =>
        Effect.gen(function* () {
          yield* DeclaredService;
        }),
      ),
    ).type.not.toRaiseError();
  });

  it('rejects a service the operation does not declare', () => {
    expect(
      Operation.withHandler(op, (_input) =>
        Effect.gen(function* () {
          yield* UndeclaredService;
        }),
      ),
    ).type.toRaiseError("Type 'UndeclaredService' is not assignable to type 'DeclaredService | Service'");
  });

  it('accepts Operation.Service without declaring it', () => {
    expect(
      Operation.withHandler(op, (_input) =>
        Effect.gen(function* () {
          yield* Operation.schedule(sideEffect);
        }),
      ),
    ).type.not.toRaiseError();
  });
});
