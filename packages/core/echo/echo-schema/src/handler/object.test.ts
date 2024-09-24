//
// Copyright 2024 DXOS.org
//

import { ulid } from 'ulidx';
import { describe, test } from 'vitest';

import { log } from '@dxos/log';

describe('Object', () => {
  test.skip('Ulid stress test', () => {
    const amountToGenerate = 10_000;

    const generators = [ulid];

    for (const generator of generators) {
      const start = Date.now();
      for (let i = 0; i < amountToGenerate; i++) {
        generator();
      }
      const end = Date.now();
      log.info(`Generated ${amountToGenerate} ULIDs in ${end - start}ms`);
    }
  });
});
