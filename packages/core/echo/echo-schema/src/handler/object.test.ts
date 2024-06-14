//
// Copyright 2024 DXOS.org
//

import { ulidFactory } from 'ulid-workers';

import { log } from '@dxos/log';
import { describe, test } from '@dxos/test';

describe('Object', () => {
  test('Ulid stress test', () => {
    const amountToGenerate = 10_000;

    const generators = [ulidFactory({ monotonic: false })];

    for (const generator of generators) {
      const start = Date.now();
      for (let i = 0; i < amountToGenerate; i++) {
        generator();
      }
      const end = Date.now();
      log.info(`Generated ${amountToGenerate} ULIDs in ${end - start}ms`);
    }
  }).tag('stress');
});
