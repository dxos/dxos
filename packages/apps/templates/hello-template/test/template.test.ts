//
// Copyright 2023 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';
import tmp from 'tmp-promise';

import packageJson from '../package.json';
import template from '../src/template.t';
import { scenarios } from './scenarios';

chai.use(chaiAsPromised);

describe('hello template', () => {
  it('exists', () => {
    expect(true).to.be.true;
  });

  it('execute with permuted inputs', async () => {
    console.log('executing', scenarios.length, 'configurations');
    const tempFolder = await tmp.dir({ unsafeCleanup: false, keep: true, prefix: 'hello-template' });
    console.log(`temp folder: ${tempFolder.path}`);

    const promises = scenarios.map(async (scenario) => {
      const outputDirectory = path.resolve(tempFolder.path, scenario.name);

      const results = await template.apply({
        input: { ...scenario, monorepo: false, name: `${packageJson.name}-${scenario.name}` },
        outputDirectory,
      });

      return await results.apply();
    });
    await Promise.all(promises);
    console.log('done executing template scenarios');
    console.log(`temp folder: ${tempFolder.path}`);
  });
});
