//
// Copyright 2022 DXOS.org
//

import * as url from 'url';

import { type Config } from './config.js';
import { loadTypedocJson } from './loadTypedocJson.js';
import template, { type Input } from './templates/api/template.t.js';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const generateApiDocs = async (config: Config) => {
  const { apiDocsPath, packagesPath } = config;
  const input: Input = {
    ...(await loadTypedocJson(config)),
    packagesPath,
  };
  const result = await template.apply({
    outputDirectory: apiDocsPath,
    input,
    overwrite: true,
    compilerOptions: {
      module: 'esnext',
      esModuleInterop: true,
    },
    moduleLoaderFunction: (p: string) => import(p),
  });
  void result.apply();
};
