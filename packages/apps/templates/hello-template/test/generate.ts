//
// Copyright 2023 DXOS.org
//

import path from 'path';

import { executeDirectoryTemplate } from '@dxos/plate';

import packageJson from '../package.json';
import { configs } from './configs';

const OUTPUT_FOLDER = 'out';

const main = async () => {
  console.log('executing', configs.length, 'configurations');
  const promises = configs.map(async (config) => {
    console.log(config);
    const templateDirectory = path.resolve(__dirname, '../src');
    const outputDirectory = path.resolve(__dirname, OUTPUT_FOLDER, config.name);
    const results = await executeDirectoryTemplate({
      templateDirectory,
      outputDirectory,
      input: { ...config, monorepo: false, name: `${packageJson.name}-${config.name}` },
      interactive: true
    });
    return Promise.all(results.map((r) => r.save()));
  });
  await Promise.all(promises);
  console.log('done');
};

void main();
