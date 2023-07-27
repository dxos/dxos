import path from 'path';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { scenarios } from './scenarios';

import packageJson from '../package.json';
import tmp from 'tmp-promise';
import template from '../src/template.t';

chai.use(chaiAsPromised);

describe('template', () => {
  it('exists', () => {
    expect(true).to.be.true;
  });

  it('execute with permuted inputs', async () => {
    console.log('executing', scenarios.length, 'configurations');
    const tempFolder = await tmp.dir({ unsafeCleanup: true, prefix: 'bare-template' });
    console.log(`temp folder: ${tempFolder.path}`);
    
    const promises = scenarios.slice(0, 1).map(async (scenario) => {
      const outputDirectory = path.resolve(tempFolder.path, scenario.name);

      const results = await template.apply({
        input: { ...scenario, monorepo: false, name: `${packageJson.name}-${scenario.name}` },
        outputDirectory,
        interactive: false,
        verbose: true
      });
      
      return await results.apply();
    });
    await Promise.all(promises);
    console.log('done executing template scenarios');
    console.log(`temp folder: ${tempFolder.path}`);
  })
});
