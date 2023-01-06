import path from 'path';
import { executeDirectoryTemplate } from '@dxos/plate';
import { configs } from './configs';
import { exec as _exec } from 'child_process';
import { promisify } from 'util';

const exec = promisify(_exec);

const main = async () => {
  console.log('executing', configs.length, 'configurations');
  const promises = configs.map(async (config) => {
    console.log(config);
    const templateDirectory = path.resolve(__dirname, '../src');
    const outputDirectory = path.resolve(__dirname, 'variants', config.name);
    const results = await executeDirectoryTemplate({
      templateDirectory,
      outputDirectory,
      input: { ...config, monorepo: true, name: `@dxos/sample-${config.name}` },
      interactive: true
    });
    return Promise.all(results.map(r => r.save()));
  });
  await Promise.all(promises);
  console.log('done');
};

main();
