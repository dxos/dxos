//
// Copyright 2022 DXOS.org
//

import path from 'path';
import * as url from 'url';

import { executeDirectoryTemplate } from '@dxos/plate';

import { Config } from './config.js';
import { loadTypedocJson } from './loadTypedocJson.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const generateApiDocs = async (config: Config) => {
  const { apiDocsPath } = config;
  const api = await loadTypedocJson(config);
  const files = await executeDirectoryTemplate({
    outputDirectory: apiDocsPath,
    templateDirectory: path.resolve(__dirname, 'templates/api'),
    input: api,
    compilerOptions: {
      module: 'esnext'
    },
    moduleLoaderFunction: (p: string) => import(p)
  });
  (await Promise.all(files.map((f) => f.save()))).map((f) => console.log('wrote', f?.shortDescription()));
};
