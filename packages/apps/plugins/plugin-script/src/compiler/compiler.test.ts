//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Compiler } from './compiler';

describe('Compiler', () => {
  test('Basic', async () => {
    const compiler = new Compiler();
    const result = await compiler.compile('const x = 100'); // TODO(burdon): Test import.
    console.log(JSON.stringify(result, undefined, 2));
    expect(result).to.exist;
  });
});
