//
// Copyright 2022 DXOS.org
//

import { promises as fs } from 'fs';
import { type JSONOutput } from 'typedoc';

import { type Config } from './config.js';

export const loadTypedocJson = async (config: Config): Promise<JSONOutput.ProjectReflection> => {
  const { typedocJsonPath } = config;
  const apitext = await fs.readFile(typedocJsonPath, 'utf-8');
  const api = JSON.parse(apitext);
  return api as JSONOutput.ProjectReflection;
};
