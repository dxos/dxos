//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { safeInstanceof } from './safe-instanceof';

describe('safeInstanceOf', () => {
  test('different classes with the same tag are compatible', () => {
    @safeInstanceof('testTag')
    class Tagged1 {}

    @safeInstanceof('testTag')
    class Tagged2 {}

    class NotTagged {}

    @safeInstanceof('testTag2')
    class DifferentTag {}

    const SameGroup = [Tagged1, Tagged2];
    const DifferentGroup = [NotTagged, DifferentTag];

    [...SameGroup, ...DifferentGroup].forEach((C1) =>
      DifferentGroup.forEach((C2) => {
        // instanceof should return true if the constructors are from the SameGroup or are the same
        expect(new C1() instanceof C2).to.eq(C1 === C2 || (SameGroup.includes(C1) && SameGroup.includes(C2)));
      }),
    );
  });

  test('works with undefined', () => {
    @safeInstanceof('testTag')
    class Tagged {}

    expect((undefined as any) instanceof Tagged).to.eq(false);
  });
});
