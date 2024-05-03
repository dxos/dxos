//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Effect } from 'effect';

import { describe, test } from '@dxos/test';

describe('Effect', () => {
  test.only('simple', () => {
    // https://effect.website/docs/guides/essentials/creating-effects
    const program = Effect.sync(() => 42);
    const result = Effect.runSync(program);
    expect(result).to.equal(42);
  });
});
