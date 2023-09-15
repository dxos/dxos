//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import path from 'node:path';

export type Config = {
  include: string[];
  typedocJsonPath: string;
  apiDocsPath: string;
  packagesPath: string;
  configPath: string;
};

export const loadConfig = async (): Promise<Config> => {
  const configPath = path.resolve('apidoc.json');
  const content = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  const { packagesPath, apiDocsPath, typedocJsonPath } = content;
  const configDir = path.dirname(configPath);
  content.packagesPath = packagesPath ? path.resolve(configDir, packagesPath) : packagesPath;
  content.apiDocsPath = apiDocsPath ? path.resolve(configDir, apiDocsPath) : apiDocsPath;
  content.typedocJsonPath = typedocJsonPath ? path.resolve(configDir, typedocJsonPath) : typedocJsonPath;
  return { configPath, ...content } as Config;
};
