//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';

export type Config = {
  include: string[];
  typedocJsonPath: string;
  apiDocsPath: string;
};

export const loadConfig = async (): Promise<Config> => {
  const content = await fs.readFile('apidoc.json', 'utf-8');
  return JSON.parse(content) as Config;
};
