//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';
import tmp from 'tmp-promise';

import { scenarios } from './scenarios';
import packageJson from '../package.json';
import template from '../src/template.t';

chai.use(chaiAsPromised);

describe('plugin template', () => {
  it('exists', () => {
    expect(true).to.be.true;
  });

  it('execute with permuted inputs', async () => {
    console.log('executing', scenarios.length, 'scenarios...');
    const tempFolder = await tmp.dir({ unsafeCleanup: false, keep: true, prefix: 'plugin-template' });

    const promises = scenarios.map(async (scenario) => {
      const outputDirectory = path.resolve(tempFolder.path);

      const results = await template.apply({
        input: { ...scenario, name: `${packageJson.name.split('/')[1]}-${scenario.name}` },
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
