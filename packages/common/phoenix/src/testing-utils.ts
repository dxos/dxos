//
// Copyright 2023 DXOS.org
//

import { existsSync, mkdirSync, unlinkSync } from 'node:fs';

export const TEST_DIR = '/tmp/dxos/testing/phoenix';

if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

export const neverEndingProcess = () => {
  // eslint-disable-next-line no-console
  console.log(`neverEndingProcess started ${1}`);
  setTimeout(() => {}, 1_000_000);
};

export const clearFiles = (...filenames: string[]) => {
  filenames.forEach((filename) => {
    if (existsSync(filename)) {
      unlinkSync(filename);
    }
  });
};
