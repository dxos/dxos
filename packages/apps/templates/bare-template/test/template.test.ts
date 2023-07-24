import path from 'path';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { scenarios } from './scenarios';
import { executeDirectoryTemplate } from '@dxos/plate';
import packageJson from '../package.json';
import tmp from 'tmp-promise';

chai.use(chaiAsPromised);

describe('template', () => {
  it('exists', () => {
    expect(true).to.be.true;
  });

  it('execute with permuted inputs', async () => {
    console.log('executing', scenarios.length, 'configurations');
    const tempFolder = await tmp.dir({ unsafeCleanup: true, prefix: 'bare-template-' });
    console.log(`temp folder: ${tempFolder.path}`);
    const templateDirectory = path.resolve(__dirname, '../src');
    const promises = scenarios.map(async (scenario) => {
      console.log(JSON.stringify(scenario));
      const outputDirectory = path.resolve(tempFolder.path, scenario.name);
      const results = await executeDirectoryTemplate({
        templateDirectory,
        outputDirectory,
        input: { ...scenario, monorepo: false, name: `${packageJson.name}-${scenario.name}` },
        interactive: false,
      });
      return results.save();
    });
    await Promise.all(promises);
    console.log('done executing template scenarios');
    console.log(`temp folder: ${tempFolder.path}`);
  })
});
