//
// Copyright 2023 DXOS.org
//

import { existsSync, mkdirSync, unlinkSync } from 'node:fs';

export const TEST_DIR = '/tmp/dxos/testing/phoenix';
mkdirSync(TEST_DIR, { recursive: true });

export const neverEndingProcess = () => {
  console.log('started');
  setTimeout(() => {}, 1_000_000);
};

export const clearFiles = (...filenames: string[]) => {
  filenames.forEach((filename) => {
    if (existsSync(filename)) {
      unlinkSync(filename);
    }
  });
};
