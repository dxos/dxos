//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Bundler } from './bundler';

describe('Bundler', () => {
  test('Basic', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle('const x = 100'); // TODO(burdon): Test import.
    expect(result).to.exist;
  });
});
