//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { readFile } from 'fs/promises';
import path from 'path';
import tmp from 'tmp-promise';

import { scenarios } from './scenarios';
import template from '../src/template.t';

chai.use(chaiAsPromised);

describe('bare template', () => {
  it('exists', () => {
    expect(true).to.be.true;
  });

  it('execute with permuted inputs', async () => {
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
