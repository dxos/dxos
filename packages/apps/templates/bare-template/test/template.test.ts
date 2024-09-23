//
// Copyright 2023 DXOS.org
//

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import tmp from 'tmp-promise';
import { describe, test } from 'vitest';

import { scenarios } from './scenarios';
import template from '../src/template.t';

describe('bare template', () => {
  test('execute with permuted inputs', async () => {
    console.log('executing', scenarios.length, 'scenarios...');
    const tempFolder = await tmp.dir({ unsafeCleanup: false, keep: true, prefix: 'bare-template' });
    const packageJson = JSON.parse(
      await readFile(path.resolve(__dirname, '..', 'package.json'), { encoding: 'utf-8' }),
    );

    const promises = scenarios.map(async (scenario) => {
      const outputDirectory = path.resolve(tempFolder.path, scenario.name);

      const results = await template.apply({
        input: { ...scenario, monorepo: false, name: `${packageJson.name}-${scenario.name}` },
        outputDirectory,
        after: false, // do not print messages
      });

      return await results.apply();
    });
    await Promise.all(promises);
    console.log('done executing scenarios');
    console.log(`temp folder: ${tempFolder.path}`);
  });
});
