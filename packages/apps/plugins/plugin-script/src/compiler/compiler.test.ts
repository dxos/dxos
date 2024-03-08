//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Compiler } from './compiler';

describe('Compiler', () => {
  test('Basic', async () => {
    const compiler = new Compiler({ platform: 'node', providedModules: [] });
    const result = await compiler.compile('const x = 100'); // TODO(burdon): Test import.
    expect(result).to.exist;
  });
});
