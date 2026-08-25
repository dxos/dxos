//
// Copyright 2026 DXOS.org
//

// This file needs invalid usage, so the diagnostic reporting it is the assertion.
/** @effect-diagnostics unnecessaryEffectGen:skip-file */

import * as Effect from 'effect/Effect';
import { describe, expect, it } from 'tstyche';

import * as Capability from './capability';

type Example = { example: string };

const single = Capability.makeSingleton<Example>()('org.dxos.test.single');
const multi = Capability.make<Example>()('org.dxos.test.multi');

describe('Capability arity', () => {
  it('contributeAll accepts a multi tag', () => {
    expect(Capability.contributeAll(multi, [{ example: 'one' }])).type.not.toRaiseError();
  });

  it('contributeAll rejects a singleton tag', () => {
    expect(Capability.contributeAll(single, [{ example: 'value' }])).type.toRaiseError(
      "is not assignable to parameter of type 'MultiTag",
    );
  });

  it('a multi tag is not a singleton tag', () => {
    const singletonOnly: Capability.Tag<Example>[] = [single];
    expect(singletonOnly.push(multi)).type.toRaiseError("is not assignable to parameter of type 'Tag");
  });
});

describe('Capability requirements channel', () => {
  it('carries a declared capability', () => {
    expect(
      Effect.gen(function* () {
        return yield* single;
      }),
    ).type.toBeAssignableTo<Effect.Effect<Example, never, Capability.Requirements<readonly [typeof single]>>>();
  });

  it('rejects an undeclared capability against an empty requirements channel', () => {
    const undeclared = Capability.makeSingleton<Example>()('org.dxos.test.undeclared');
    expect(
      Effect.gen(function* () {
        return yield* undeclared;
      }),
    ).type.not.toBeAssignableTo<Effect.Effect<Example, never, Capability.Requirements<readonly []>>>();
  });
});
