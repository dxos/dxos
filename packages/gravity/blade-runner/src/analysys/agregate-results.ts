//
// Copyright 2024 DXOS.org
//

import fs from 'node:fs/promises';
import path from 'node:path';

import { log } from '@dxos/log';

// Note(mykola): This is a simple script to aggregate results from different blade-runner test runs.

const main = async () => {
  const results = [];
  const RESULTS_PATH = '/Users/mykola/Documents/dev/dxos/packages/gravity/blade-runner/out/results';
  const dirs = await fs.readdir(RESULTS_PATH);
  for (const dir of dirs) {
    const testJson = await fs.readFile(path.join(RESULTS_PATH, dir, 'test.json')).catch(() => {});
    if (!testJson) {
      log.info(`No test.json file found in ${dir}`);
      continue;
    }
    const summary = JSON.parse(testJson.toString());
    results.push({
      queryTime: summary.results.diskQueryTime,
      numberOfObjects: summary.spec.numberOfObjects,
      numberOfMutations: summary.spec.numberOfInsertions,
      mutationSize: summary.spec.insertionSize,
    });
  }
  log.info(JSON.stringify(results, null, 2));
};

void main();
