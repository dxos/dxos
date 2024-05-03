//
// Copyright 2023 DXOS.org
//

import { existsSync, mkdirSync, unlinkSync } from 'node:fs';

import { log } from '@dxos/log';

export const TEST_DIR = '/tmp/dxos/testing/phoenix';
if (!existsSync(TEST_DIR)) {
  mkdirSync(TEST_DIR, { recursive: true });
}

export const neverEndingProcess = () => {
  log.info('neverEndingProcess started');
  setTimeout(() => {}, 1_000_000);
};

export const clearFiles = (...filenames: string[]) => {
  filenames.forEach((filename) => {
    if (existsSync(filename)) {
      unlinkSync(filename);
    }
  });
};
