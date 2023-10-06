//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Path } from './path';

describe('paths', () => {
  test('create', () => {
    const path = Path.create('a', 'b', 'c');
    expect(Path.first(path)).to.eq('a');
    expect(Path.last(path)).to.eq('c');
    expect(Path.hasRoot(path, 'a')).to.be.true;
    expect(Path.hasDescendent(Path.create('a', 'b'), path)).to.be.true;
  });
});
