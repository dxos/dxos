//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { Effect } from 'effect';

import { describe, test } from '@dxos/test';

describe('Effect', () => {
  test.only('simple', () => {
    // https://effect.website/docs/guides/essentials/creating-effects
    const program = Effect.succeed(42);
    expect(program.value).to.equal(42);
  });
});
